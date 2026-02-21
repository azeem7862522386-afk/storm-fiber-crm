import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, Cable } from "lucide-react";
import type { ConnectionRequestWithRelations } from "@shared/schema";

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ConnectionRegistrationSlipPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: request, isLoading } = useQuery<ConnectionRequestWithRelations>({
    queryKey: ["/api/connection-requests", params.id],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] max-w-[320px] mx-auto" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <Cable className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Connection request not found</p>
        <Link href="/new-connections">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to New Connections
          </Button>
        </Link>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    assigned_engineer: "Engineer Assigned",
    assigned_fieldworker: "Field Worker Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="p-4 md:p-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/new-connections")}
            data-testid="button-back-to-connections"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-slip-title">
            Registration Slip
          </h1>
        </div>
        <Button onClick={() => window.print()} data-testid="button-print-slip">
          <Printer className="mr-2 h-4 w-4" /> Print Slip
        </Button>
      </div>

      <div className="max-w-[320px] mx-auto" data-testid="slip-container">
        <div className="receipt-slip bg-white text-black border border-border rounded-md overflow-visible print:border-none print:rounded-none print:shadow-none" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          <div className="px-3 pt-3 pb-1 text-center">
            <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="w-full max-w-[240px] mx-auto mb-1" />
            <p className="text-[9px] text-gray-600 leading-snug">
              Basement Soneri Bank, Alama Iqbal Road, Pattoki
            </p>
          </div>

          <div className="px-3 py-1">
            <div className="border-t border-b border-gray-400 text-center py-0.5">
              <span className="text-xs font-bold">Connection Registration Slip</span>
            </div>
          </div>

          <div className="px-3 py-1 text-[11px] space-y-0.5">
            <div className="flex justify-between" data-testid="text-slip-reg-no">
              <span>Reg # : <span className="font-semibold ml-1">CR-{String(request.id).padStart(5, "0")}</span></span>
              <span className="text-[10px]">{formatDateTime(request.createdAt)}</span>
            </div>
            <div data-testid="text-slip-cust-name">
              Name : <span className="ml-3 font-semibold uppercase">{request.customerName}</span>
            </div>
            <div data-testid="text-slip-contact">
              Contact : <span className="font-semibold">{request.customerContact}</span>
            </div>
            {request.customerWhatsapp && (
              <div data-testid="text-slip-whatsapp">
                WhatsApp : <span className="font-semibold">{request.customerWhatsapp}</span>
              </div>
            )}
            <div data-testid="text-slip-address">
              Address : <span className="uppercase">{request.customerAddress}</span>
            </div>
            {request.customerCnic && (
              <div data-testid="text-slip-cnic">
                CNIC : <span className="font-semibold">{request.customerCnic}</span>
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1">
            <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
              <span className="font-semibold">Connection Details</span>
            </div>
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Package :</span>
                <span className="font-semibold" data-testid="text-slip-plan">
                  {request.plan?.name || "To be assigned"} {request.plan?.speed ? `(${request.plan.speed})` : ""}
                </span>
              </div>
              {request.plan?.price && (
                <div className="flex justify-between">
                  <span>Monthly Fee :</span>
                  <span className="font-semibold" data-testid="text-slip-price">
                    Rs. {Number(request.plan.price).toLocaleString("en-PK")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Modem :</span>
                <span className="font-semibold" data-testid="text-slip-modem">
                  {(request as any).modemOwnership === "customer" ? "Customer Owned" : "Company Owned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status :</span>
                <span className="font-semibold" data-testid="text-slip-status">
                  {statusLabels[request.status] || request.status}
                </span>
              </div>
              {(request as any).registeredBy && (
                <div className="flex justify-between">
                  <span>Registered By :</span>
                  <span className="font-semibold">{(request as any).registeredBy}</span>
                </div>
              )}
            </div>
          </div>

          {request.notes && (
            <div className="px-3 py-1 text-[11px]">
              <div className="border-t border-gray-300 pt-1">
                <span className="font-semibold">Notes:</span>
                <div className="mt-0.5">{request.notes}</div>
              </div>
            </div>
          )}

          <div className="px-3 pt-2 pb-1 text-[11px]">
            <div className="border-t border-gray-300 pt-1">
              <p className="font-semibold text-center mb-1">Terms & Conditions</p>
              <ul className="space-y-0.5 text-[9px] text-gray-700 list-disc pl-3">
                <li>Connection will be completed within 2-3 working days.</li>
                <li>Equipment provided remains property of Storm Fiber.</li>
                <li>Monthly payment is due by the 10th of each month.</li>
                <li>Service may be suspended for non-payment.</li>
              </ul>
            </div>
          </div>

          <div className="px-3 pt-3 pb-1 text-[11px]">
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between">
                <div>
                  <div className="border-t border-gray-400 mt-6 pt-1 text-center text-[10px]">
                    Customer Signature
                  </div>
                </div>
                <div>
                  <div className="border-t border-gray-400 mt-6 pt-1 text-center text-[10px]">
                    Authorized Signature
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 pt-3 pb-3 text-center space-y-0.5 text-[11px]">
            <p className="font-bold">Thank you for choosing Storm Fiber!</p>
            <p>For Connection &amp; Complain</p>
            <p className="font-semibold">0307-8844421 0327-0223873</p>
            <p className="text-[9px] text-gray-500 pt-1">Software developed by: Fast Click Solutions, Ptk</p>
            <p className="text-[9px] text-gray-500">www.fastclicksolutions.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
