import { Pencil } from "lucide-react";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { EquipmentDialog } from "@/components/master-data/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setEquipmentStatus, updateEquipment } from "@/app/actions/master-data";
import { EQUIPMENT_TYPES, formatDate, formatNumber, type EquipmentType } from "@/lib/labels";
import type { Database } from "@/lib/database.types";

type EquipmentRow = Database["public"]["Views"]["v_equipment"]["Row"];

// Equipment table shared by the equipment list and the customer page.
// Edit dialogs take their site list from <SiteOptionsProvider> higher up.
export function EquipmentTable({
  rows, canEdit, showCustomer = true,
}: { rows: EquipmentRow[]; canEdit: boolean; showCustomer?: boolean }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead>{showCustomer ? "Customer / site" : "Site"}</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead className="hidden lg:table-cell">Warranty</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => (
            <TableRow key={e.id} className={e.status === "DECOMMISSIONED" ? "opacity-60" : undefined}>
              <TableCell>
                <div className="font-medium">{e.manufacturer} {e.model}</div>
                <div className="text-xs text-muted-foreground">
                  {e.serial_number} · {formatNumber(e.cooling_capacity_kw)} kW
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{EQUIPMENT_TYPES[e.equipment_type as EquipmentType]}</TableCell>
              <TableCell>
                {showCustomer && <div>{e.customer_name}</div>}
                <div className={showCustomer ? "text-xs text-muted-foreground" : undefined}>{e.site_name}, {e.city}</div>
              </TableCell>
              <TableCell>
                {e.status === "DECOMMISSIONED" ? (
                  <Badge variant="outline">Decommissioned</Badge>
                ) : e.is_covered ? (
                  <Badge variant="secondary">{e.current_contract_number}</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">No contract</Badge>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {e.warranty_end_date ? (
                  <span className={e.in_warranty ? undefined : "text-muted-foreground"}>
                    {e.in_warranty ? "Until " : "Ended "}{formatDate(e.warranty_end_date)}
                  </span>
                ) : "–"}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EquipmentDialog
                      title={`Edit ${e.serial_number}`}
                      action={updateEquipment.bind(null, e.id!)}
                      equipment={{
                        site_id: e.site_id!, serial_number: e.serial_number!, manufacturer: e.manufacturer!, model: e.model!,
                        equipment_type: e.equipment_type!, cooling_capacity_kw: e.cooling_capacity_kw,
                        install_date: e.install_date, warranty_end_date: e.warranty_end_date, notes: e.notes,
                      }}
                      trigger={<Button variant="ghost" size="icon" aria-label={`Edit ${e.serial_number}`}><Pencil className="size-4" /></Button>}
                    />
                    {e.status === "ACTIVE" ? (
                      <ConfirmButton
                        action={setEquipmentStatus.bind(null, e.id!, "DECOMMISSIONED")}
                        title="Decommission this unit?"
                        description={`${e.manufacturer} ${e.model} (${e.serial_number}) will be marked as out of service. It stays in the history and is no longer copied into contract renewals.`}
                        confirmLabel="Decommission"
                        variant="ghost"
                      >
                        Decommission
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        action={setEquipmentStatus.bind(null, e.id!, "ACTIVE")}
                        title="Put this unit back in service?"
                        description={`${e.serial_number} will be active again.`}
                        confirmLabel="Reactivate"
                        variant="ghost"
                      >
                        Reactivate
                      </ConfirmButton>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No equipment found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
