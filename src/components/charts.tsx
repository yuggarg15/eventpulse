"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ChannelChart({ data }: { data: { channel: string; clicks: number; registrations: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="channel" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
        <Bar dataKey="clicks" fill="#a5b4fc" name="Clicks" /><Bar dataKey="registrations" fill="#4f46e5" name="Registrations" /></BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { date: string; registrations: number; checkins: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
        <Line dataKey="registrations" stroke="#4f46e5" name="Registrations" /><Line dataKey="checkins" stroke="#16a34a" name="Check-ins" /></LineChart>
    </ResponsiveContainer>
  );
}
