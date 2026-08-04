import { PageHeader } from "@/components/shell/page-header";
import { ImportForm } from "../import-form";
import { importOrganizationsAction } from "./actions";

export default function ImportOrganisationsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Import organisations" description="Bulk-create funds, portfolio companies and other organisations from a CSV file." />
      <ImportForm
        action={importOrganizationsAction}
        templateColumns={["name", "type", "website", "hqCity", "hqCountryCode", "accountPriority"]}
        templateExample='Example: "Acme Capital,PE_FUND,acmecapital.com,London,GB,PRIORITY"'
      />
    </div>
  );
}
