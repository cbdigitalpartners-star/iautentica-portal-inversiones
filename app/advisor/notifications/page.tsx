import { NotificationsList } from "@/components/notifications-list";

export default function AdvisorNotificationsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Notificaciones</h1>
      <NotificationsList role="advisor" />
    </div>
  );
}
