import { Server, ServerRoute } from "@hapi/hapi";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import leaveTypeRoutes from "./leaveTypeRoutes";
import leaveBalanceRoutes from "./leaveBalanceRoutes";
import leaveRequestRoutes from "./leaveRequestRoutes";
import holidayRoutes from "./holidayRoutes";
import approvalWorkflowRoutes from "./approvalWorkflowRoutes";
import workflowCategoryRoutes from "./workflowCategoryRoutes";
import workflowLevelRoutes from "./workflowLevelRoutes";
import approverTypeRoutes from "./approverTypeRoutes";
import dashboardRoutes from "./dashboardRoutes";
import roleRoutes from "./roleRoutes";
import departmentRoutes from "./departmentRoutes";
import positionRoutes from "./positionRoutes";
import pageRoutes from "./pageRoutes";
import scriptRoutes from "./scriptRoutes";
import { debugRoutes } from "./debugRoutes";

export const registerRoutes = (server: Server): void => {
  const healthCheckRoute: ServerRoute = {
    method: "GET",
    path: "/api/health",
    handler: () => ({ status: "ok", timestamp: new Date().toISOString() }),
    options: {
      auth: false,
      description: "Health check endpoint",
      tags: ["api", "health"],
    },
  };
  
  // Root path health check for Railway
  const rootHealthCheckRoute: ServerRoute = {
    method: "GET",
    path: "/",
    handler: () => ({ 
      status: "ok", 
      service: "Leave Management API", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }),
    options: {
      auth: false,
      description: "Root health check endpoint for Railway",
      tags: ["api", "health"],
    },
  };

  server.route([
    // Root health check route (must be first to ensure it's not blocked by auth)
    rootHealthCheckRoute,
    // API health check route
    healthCheckRoute,
    // Application routes
    ...authRoutes,
    ...userRoutes,
    ...leaveTypeRoutes,
    ...leaveBalanceRoutes,
    ...leaveRequestRoutes,
    ...holidayRoutes,
    ...approvalWorkflowRoutes,
    ...workflowCategoryRoutes,
    ...workflowLevelRoutes,
    ...approverTypeRoutes,
    ...dashboardRoutes,
    ...roleRoutes,
    ...departmentRoutes,
    ...positionRoutes,
    ...pageRoutes,
    ...scriptRoutes,
    ...debugRoutes,
  ]);
};
