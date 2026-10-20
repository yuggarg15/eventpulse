// Runs the automation engine every hour (reminders, feedback, certificates, alerts).
export default async () => {
  const base = process.env.URL;
  if (!base || !process.env.CRON_SECRET) return;
  await fetch(`${base}/api/cron/run`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
};

export const config = { schedule: "0 * * * *" };
