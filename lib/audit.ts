import { connectDB } from "./db";
import { AuditLog } from "./models/AuditLog";
import { Types } from "mongoose";

export async function writeAudit(params: {
  orderModel: string;
  orderId: any;
  action: string;
  field?: string | null;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  userName?: string;
  userRole?: string;
}) {
  await connectDB();
  await AuditLog.create({
    orderModel: params.orderModel,
    orderId: params.orderId,
    action: params.action,
    field: params.field ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    userId: params.userId ?? null,
    userName: params.userName ?? null,
    userRole: params.userRole ?? null,
    at: new Date(),
  });
}
