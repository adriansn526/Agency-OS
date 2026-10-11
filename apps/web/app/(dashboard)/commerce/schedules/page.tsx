import { redirect } from "next/navigation"

/** The schedules now live on the supplier sync page (they configure the sync jobs); keep old links working. */
export default function SchedulesRedirect() {
  redirect("/commerce/sync#programari")
}
