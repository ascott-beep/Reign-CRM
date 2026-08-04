import { PageHeader } from "@/components/shell/page-header";
import { ImportForm } from "../import-form";
import { importPeopleAction } from "./actions";

export default function ImportPeoplePage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Import people" description="Bulk-create people and candidates from a CSV file." />
      <ImportForm
        action={importPeopleAction}
        templateColumns={["firstName", "lastName", "primaryEmail", "primaryPhone", "personTypes"]}
        templateExample='Example: "Jane,Doe,jane.doe@example.com,+44 20 1234 5678,CANDIDATE" (personTypes is pipe-separated, e.g. CANDIDATE|REFERRER)'
      />
    </div>
  );
}
