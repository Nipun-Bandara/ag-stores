import { successResponse } from "@/lib/api-response";
import { getHealthStatus } from "@/services/health.service";

export function GET() {
  return successResponse(getHealthStatus());
}
