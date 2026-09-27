export interface HealthStatus {
  status: "ok";
  service: "ag-stores";
  timestamp: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "ag-stores",
    timestamp: new Date().toISOString(),
  };
}
