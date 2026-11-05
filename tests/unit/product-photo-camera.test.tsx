import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProductPhotoCamera } from "@/features/owner/components/product-photo-camera";
const stop = vi.fn();
const getUserMedia = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "navigator",
    Object.create(navigator, { mediaDevices: { value: { getUserMedia } } }),
  );
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("captures a JPEG from the camera preview and releases the stream on close", async () => {
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
  const capture = vi.fn();
  const close = vi.fn();
  const { unmount } = render(
    <ProductPhotoCamera
      onCapture={capture}
      onClose={close}
      onNativeCapture={vi.fn()}
    />,
  );
  const button = screen.getByRole("button", { name: "Take photo" });
  await waitFor(() => expect(button).toBeEnabled());
  const video = screen.getByLabelText("Camera preview");
  Object.defineProperties(video, {
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["photo"], { type: "image/jpeg" })),
  );
  fireEvent.click(button);
  expect(capture).toHaveBeenCalledWith(expect.any(File));
  expect(capture.mock.calls[0]![0].type).toBe("image/jpeg");
  expect(draw).toHaveBeenCalledWith(video, 0, 0, 1600, 900);
  expect(close).toHaveBeenCalled();
  unmount();
  expect(stop).toHaveBeenCalled();
});
it("explains denied camera permission and offers the device camera fallback", async () => {
  getUserMedia.mockRejectedValue(new Error("NotAllowedError"));
  const native = vi.fn();
  const close = vi.fn();
  render(
    <ProductPhotoCamera
      onCapture={vi.fn()}
      onClose={close}
      onNativeCapture={native}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to access the camera.",
  );
  expect(screen.getByRole("button", { name: "Take photo" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Use device camera" }));
  expect(native).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
});
