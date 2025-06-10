import React, { useState, useEffect } from "react";
import { Users, FileText, Activity, BarChart3 } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { PDFManagement } from "./PDFManagement";
import { Card, CardContent, CardHeader } from "../ui/Card";
import apiService from "../../services/api"; // make sure this exports getUsers, getPDFs, getChatHistory

type TabType = "overview" | "users" | "pdfs";

interface ActivityItem {
  action: string;
  user: string;
  time: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Overview state
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [dailyQueries, setDailyQueries] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverview();
    }
  }, [activeTab]);

  const fetchOverview = async () => {
    try {
      // 1) Users count
      const usersRes = await apiService.getUsers();
      const users = usersRes.success ? usersRes.users : [];
      setTotalUsers(users.length);

      // 2) PDF count
      const pdfsRes = await apiService.getPDFs();
      const pdfs = pdfsRes.success ? pdfsRes.pdfs : [];
      setTotalDocs(pdfs.length);

      // 3) Chat history → daily queries
      const chatRes = await apiService.getChatHistory();
      const convs = chatRes.success ? chatRes.conversations : [];
      // count those within last 24h
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentChats = convs.filter(
        (c) => new Date(c.timestamp).getTime() >= oneDayAgo
      );
      setDailyQueries(recentChats.length);

      // 4) Build recent activity list (merge latest from each category)
      const activities: ActivityItem[] = [];

      // Latest user signup
      if (users.length) {
        const newestUser = users[users.length - 1];
        activities.push({
          action: "New user registered",
          user: newestUser.email,
          time: new Date(newestUser.created_date).toLocaleString(),
        });
      }

      // Latest PDF upload
      if (pdfs.length) {
        const newestPdf = pdfs[0]; // ordered desc
        activities.push({
          action: "PDF uploaded",
          user: newestPdf.uploaded_by,
          time: new Date(newestPdf.upload_date).toLocaleString(),
        });
      }

      // Latest chat sessions (up to 2)
      recentChats.slice(0, 2).forEach((chat) => {
        activities.push({
          action: "Chat session started",
          user: chat.user_id,
          time: new Date(chat.timestamp).toLocaleString(),
        });
      });

      setRecentActivities(activities);
    } catch (err) {
      console.error("Failed to load overview:", err);
    }
  };

  const tabs = [
    { id: "overview" as TabType, name: "Overview", icon: Activity },
    { id: "users" as TabType, name: "Users", icon: Users },
    { id: "pdfs" as TabType, name: "PDFs", icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "pdfs":
        return <PDFManagement />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {totalUsers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium">
                    Documents
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {totalDocs}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-emerald-600" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">
                    Daily Queries
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {dailyQueries}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <h3 className="text-lg font-bold text-gray-900">
                  Recent Activity
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-500">{activity.user}</p>
                      </div>
                      <span className="text-sm text-gray-400">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage users, documents, and system settings
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
};
