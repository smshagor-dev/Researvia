'use client';
import { useAdminDashboard } from '@/lib/hooks';
import { analyticsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, CreditCard, Mail, CheckCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const { data: stats } = useAdminDashboard();
  const { data: growth } = useQuery({ queryKey:['user-growth'], queryFn: () => analyticsApi.getUserGrowth(30) });
  const s = stats as any || {};
  const growthData = growth as any[] || [];

  const cards = [
    { label:'Total Users', value: s.users || 0, icon: Users, color:'text-blue-600 bg-blue-50' },
    { label:'Professors', value: s.professors || 0, icon: GraduationCap, color:'text-green-600 bg-green-50' },
    { label:'Active Subscriptions', value: s.activeSubs || 0, icon: CreditCard, color:'text-purple-600 bg-purple-50' },
    { label:'Scholarships', value: s.scholarships || 0, icon: BookOpen, color:'text-orange-600 bg-orange-50' },
    { label:'Emails Sent Today', value: s.emailsSentToday || 0, icon: Mail, color:'text-indigo-600 bg-indigo-50' },
    { label:'Pending Verifications', value: s.pendingVerifications || 0, icon: CheckCircle, color:'text-red-600 bg-red-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {growthData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> User Growth (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
