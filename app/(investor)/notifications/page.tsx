import { NotificationsList } from "@/components/notifications-list";

export default function InvestorNotificationsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Notificaciones</h1>
      <NotificationsList />
    </div>
  );
}
