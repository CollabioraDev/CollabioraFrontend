import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell,
  MessageSquare,
  Users,
  TrendingUp,
  Reply,
  Heart,
  FileText,
  Beaker,
  UserPlus,
  ThumbsUp,
  CheckCircle2,
  Calendar,
  Filter,
  Send,
  Eye,
  User,
  Check,
  X,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");
  const [insights, setInsights] = useState({
    notifications: [],
    unreadCount: 0,
    metrics: {},
  });
  const [followers, setFollowers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isPolling, setIsPolling] = useState(true);
  // Connection requests and connections for researchers
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  // Meeting requests for researchers and patients
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  // Modal states
  const [acceptMeetingModal, setAcceptMeetingModal] = useState({
    open: false,
    requestId: null,
    meetingDate: "",
    meetingNotes: "",
  });
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    
    // Redirect to sign in if user is not logged in
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in first");
      navigate("/signin");
      return;
    }
    
    setUser(userData);

    if (userData?._id || userData?.id) {
      const userId = userData._id || userData.id;
      
      // Load all data first
      loadInsights(userId).then(() => {
        setLoading(false);
      });
      
      if (userData.role === "researcher") {
        loadFollowers(userId);
        loadConnectionRequests(userId);
        loadConnections(userId);
        loadConversations(userId).then(() => {
          // Only select conversation after conversations are loaded
          const conversationId = searchParams.get("conversation");
          if (conversationId && userData.role === "researcher") {
            // Use userData directly since state might not be updated yet
            selectConversationWithUser(conversationId, userData);
          }
        });
        loadMeetingRequests(userId);
        loadResearcherUpcomingMeetings(userId);
      } else if (userData.role === "patient") {
        loadPatientMeetingRequests(userId);
        loadUpcomingMeetings(userId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time polling for updates
  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const userId = user._id || user.id;
    
    // Polling interval - check every 3 seconds for new messages/notifications
    const pollInterval = setInterval(() => {
      if (!isPolling) return;
      if (!userId) return; // Guard against missing userId

      // Always refresh conversations list to see new conversations
      loadConversations(userId).catch((err) => 
        console.warn("Error polling conversations:", err)
      );

      // Refresh notifications
      loadInsights(userId).then(() => {
        // If we have a selected conversation, refresh its messages
        if (selectedConversation && userId) {
          fetch(
            `${base}/api/messages/${userId}?conversationWith=${selectedConversation}`
          )
            .then((r) => {
              if (!r.ok) throw new Error(`Failed to fetch messages: ${r.status}`);
              return r.json();
            })
            .then((data) => {
              const newMessages = data.messages || [];
              // Only update if we got new messages (check by length or timestamp)
              setMessages((prevMessages) => {
                if (newMessages.length !== prevMessages.length) {
                  return newMessages;
                } else if (newMessages.length > 0) {
                  // Check if last message changed (new message arrived)
                  const lastNewMsg = newMessages[newMessages.length - 1];
                  const lastCurrentMsg = prevMessages[prevMessages.length - 1];
                  if (
                    !lastCurrentMsg ||
                    lastNewMsg._id?.toString() !== lastCurrentMsg._id?.toString()
                  ) {
                    return newMessages;
                  }
                }
                return prevMessages;
              });
            })
            .catch((err) => console.warn("Error polling messages:", err));
        }
      }).catch((err) => console.warn("Error polling insights:", err));

      // Refresh followers, connections, and meeting requests for researchers
      if (user.role === "researcher") {
        loadFollowers(userId).catch((err) => 
          console.warn("Error polling followers:", err)
        );
        loadConnectionRequests(userId).catch((err) => 
          console.warn("Error polling connection requests:", err)
        );
        loadConnections(userId).catch((err) => 
          console.warn("Error polling connections:", err)
        );
        loadMeetingRequests(userId).catch((err) => 
          console.warn("Error polling meeting requests:", err)
        );
        loadResearcherUpcomingMeetings(userId).catch((err) => 
          console.warn("Error polling upcoming meetings:", err)
        );
      } else if (user.role === "patient") {
        loadPatientMeetingRequests(userId).catch((err) => 
          console.warn("Error polling patient meeting requests:", err)
        );
        loadUpcomingMeetings(userId).catch((err) => 
          console.warn("Error polling upcoming meetings:", err)
        );
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [user, selectedConversation, isPolling, base]);

  // Pause polling when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadInsights(userId) {
    try {
      const response = await fetch(`${base}/api/insights/${userId}`);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("Error loading insights:", response.status, errorText);
        setInsights({
          notifications: [],
          unreadCount: 0,
          metrics: {},
        });
        setLoading(false);
        return null;
      }
      const data = await response.json();
      setInsights({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
        metrics: data.metrics || {},
      });
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Error loading insights:", error);
      setInsights({
        notifications: [],
        unreadCount: 0,
        metrics: {},
      });
      setLoading(false);
      return null;
    }
  }

  async function loadFollowers(userId) {
    try {
      const response = await fetch(`${base}/api/insights/${userId}/followers`);
      const data = await response.json();
      setFollowers(data.followers || []);
    } catch (error) {
      console.error("Error loading followers:", error);
    }
  }

  async function loadConnectionRequests(userId) {
    try {
      const response = await fetch(`${base}/api/connection-requests/${userId}?status=pending`);
      const data = await response.json();
      // Filter only received requests (where user is the receiver)
      const received = (data.requests || []).filter(req => {
        const receiverId = req.receiverId?._id || req.receiverId?.id || req.receiverId;
        return receiverId?.toString() === userId?.toString();
      });
      setConnectionRequests(received);
    } catch (error) {
      console.error("Error loading connection requests:", error);
    }
  }

  async function loadConnections(userId) {
    try {
      const response = await fetch(`${base}/api/connection-requests/${userId}/connections`);
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    }
  }

  async function loadMeetingRequests(userId) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/${userId}?status=pending`);
      const data = await response.json();
      setMeetingRequests(data.requests || []);
    } catch (error) {
      console.error("Error loading meeting requests:", error);
    }
  }

  async function loadPatientMeetingRequests(userId) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/patient/${userId}`);
      const data = await response.json();
      setMeetingRequests(data.requests || []);
    } catch (error) {
      console.error("Error loading patient meeting requests:", error);
    }
  }

  async function loadUpcomingMeetings(userId) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/patient/${userId}?status=accepted`);
      const data = await response.json();
      // Filter upcoming meetings (meetingDate is in the future)
      const now = new Date();
      const upcoming = (data.requests || []).filter(req => {
        if (!req.meetingDate) return false;
        const meetingDate = new Date(req.meetingDate);
        return meetingDate > now;
      });
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error("Error loading upcoming meetings:", error);
    }
  }

  async function loadResearcherUpcomingMeetings(userId) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/${userId}?status=accepted`);
      const data = await response.json();
      // Filter upcoming meetings (meetingDate is in the future)
      const now = new Date();
      const upcoming = (data.requests || []).filter(req => {
        if (!req.meetingDate) return false;
        const meetingDate = new Date(req.meetingDate);
        return meetingDate > now;
      });
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error("Error loading researcher upcoming meetings:", error);
    }
  }

  async function acceptConnectionRequest(requestId) {
    try {
      const response = await fetch(`${base}/api/connection-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      if (response.ok) {
        toast.success("Connection request accepted!");
        const userId = user?._id || user?.id;
        loadConnectionRequests(userId);
        loadConnections(userId);
        loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to accept connection request");
      }
    } catch (error) {
      console.error("Error accepting connection request:", error);
      toast.error("Failed to accept connection request");
    }
  }

  async function rejectConnectionRequest(requestId) {
    try {
      const response = await fetch(`${base}/api/connection-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (response.ok) {
        toast.success("Connection request rejected");
        const userId = user?._id || user?.id;
        loadConnectionRequests(userId);
        loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to reject connection request");
      }
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      toast.error("Failed to reject connection request");
    }
  }

  async function disconnectConnection(requestId) {
    try {
      const userId = user?._id || user?.id;
      const response = await fetch(`${base}/api/connection-requests/${requestId}?userId=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Connection disconnected");
        loadConnections(userId);
        loadConversations(userId);
        loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
    }
  }

  async function acceptMeetingRequest(requestId, meetingDate, meetingNotes) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/${requestId}/accept-time`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          meetingNotes: meetingNotes || null,
        }),
      });

      if (response.ok) {
        toast.success("Meeting scheduled successfully!");
        setAcceptMeetingModal({ open: false, requestId: null, meetingDate: "", meetingNotes: "" });
        const userId = user?._id || user?.id;
        loadMeetingRequests(userId);
        loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to schedule meeting");
      }
    } catch (error) {
      console.error("Error accepting meeting request:", error);
      toast.error("Failed to schedule meeting");
    }
  }

  async function rejectMeetingRequest(requestId) {
    try {
      const response = await fetch(`${base}/api/meeting-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (response.ok) {
        toast.success("Meeting request rejected");
        const userId = user?._id || user?.id;
        loadMeetingRequests(userId);
        loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to reject meeting request");
      }
    } catch (error) {
      console.error("Error rejecting meeting request:", error);
      toast.error("Failed to reject meeting request");
    }
  }

  async function loadConversations(userId) {
    if (!userId) {
      console.warn("Cannot load conversations: userId not provided");
      return Promise.resolve();
    }
    
    try {
      const response = await fetch(`${base}/api/messages/${userId}/conversations`);
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }
      const data = await response.json();
      setConversations(data.conversations || []);
      return Promise.resolve();
    } catch (error) {
      console.error("Error loading conversations:", error);
      return Promise.reject(error);
    }
  }

  async function selectConversation(otherUserId) {
    if (!user?._id && !user?.id) {
      console.warn("Cannot select conversation: user not loaded");
      return;
    }
    
    try {
      const userId = user._id || user.id;
      const response = await fetch(
        `${base}/api/messages/${userId}?conversationWith=${otherUserId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load conversation: ${response.status}`);
      }
      const data = await response.json();
      setMessages(data.messages || []);
      setSelectedConversation(otherUserId);
      setActiveTab("messages");
      
      // Mark messages as read
      try {
        await fetch(
          `${base}/api/messages/${userId}/conversation/${otherUserId}/read`,
          { method: "PATCH" }
        );
      } catch (readError) {
        console.warn("Error marking messages as read:", readError);
      }

      // Update URL
      setSearchParams({ conversation: otherUserId });
      
      // Refresh insights to update unread count
      loadInsights(userId);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    }
  }

  // Helper function to select conversation with explicit user data (for initial load)
  async function selectConversationWithUser(otherUserId, userData) {
    if (!userData?._id && !userData?.id) {
      console.warn("Cannot select conversation: user data not provided");
      return;
    }
    
    try {
      const userId = userData._id || userData.id;
      const response = await fetch(
        `${base}/api/messages/${userId}?conversationWith=${otherUserId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load conversation: ${response.status}`);
      }
      const data = await response.json();
      setMessages(data.messages || []);
      setSelectedConversation(otherUserId);
      setActiveTab("messages");
      
      // Mark messages as read
      try {
        await fetch(
          `${base}/api/messages/${userId}/conversation/${otherUserId}/read`,
          { method: "PATCH" }
        );
      } catch (readError) {
        console.warn("Error marking messages as read:", readError);
      }

      // Update URL
      setSearchParams({ conversation: otherUserId });
      
      // Refresh insights to update unread count
      loadInsights(userId);
    } catch (error) {
      console.error("Error loading conversation:", error);
      // Don't show toast on initial load to avoid annoying user
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;

    // Only researchers can send messages
    if (user?.role !== "researcher") {
      toast.error("Only researchers can send messages");
      return;
    }

    try {
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?._id || user?.id,
          receiverId: selectedConversation,
          senderRole: "researcher",
          receiverRole: "researcher", // Researchers can only message other researchers
          body: newMessage,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setNewMessage("");
        // Immediately refresh the conversation
        const userId = user?._id || user?.id;
        await selectConversation(selectedConversation);
        await loadConversations(userId);
        // Refresh insights to update notification count
        await loadInsights(userId);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  async function markAsRead(notificationId) {
    try {
      await fetch(`${base}/api/insights/${notificationId}/read`, {
        method: "PATCH",
      });
      loadInsights(user?._id || user?.id);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch(`${base}/api/insights/${user?._id || user?.id}/read-all`, {
        method: "PATCH",
      });
      loadInsights(user?._id || user?.id);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "new_reply":
      case "researcher_replied":
        return <Reply className="w-5 h-5 text-indigo-600" />;
      case "new_follower":
        return <UserPlus className="w-5 h-5 text-indigo-600" />;
      case "new_trial_match":
        return <Beaker className="w-5 h-5 text-indigo-600" />;
      case "thread_upvoted":
      case "reply_upvoted":
        return <ThumbsUp className="w-5 h-5 text-indigo-600" />;
      case "new_message":
        return <MessageSquare className="w-5 h-5 text-indigo-600" />;
      case "patient_question":
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case "connection_request":
      case "connection_request_accepted":
      case "connection_request_rejected":
        return <UserPlus className="w-5 h-5 text-indigo-600" />;
      case "meeting_request":
      case "meeting_request_accepted":
      case "meeting_request_rejected":
      case "meeting_request_cancelled":
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function handleNotificationClick(notification) {
    markAsRead(notification._id);
    
    if (notification.type === "new_message" && notification.relatedUserId && user?.role === "researcher") {
      const otherUserId = notification.relatedUserId._id || notification.relatedUserId.id || notification.relatedUserId;
      selectConversation(otherUserId.toString());
      setActiveTab("messages");
    } else if (notification.type === "new_reply" || notification.type === "researcher_replied") {
      navigate(`/forums?threadId=${notification.relatedItemId}`);
    } else if (notification.relatedItemType === "thread") {
      navigate(`/forums?threadId=${notification.relatedItemId}`);
    } else if (notification.relatedItemType === "trial") {
      navigate(`/trials`);
    } else if (notification.type === "connection_request" || notification.type === "connection_request_accepted") {
      setActiveTab("connection-requests");
    } else if (notification.type === "meeting_request" || notification.type === "meeting_request_accepted") {
      if (user?.role === "researcher") {
        // For researchers, check if it's accepted (show upcoming) or pending (show requests)
        if (notification.type === "meeting_request_accepted") {
          setActiveTab("upcoming-meetings");
        } else {
          setActiveTab("meeting-requests");
        }
      } else {
        setActiveTab("upcoming-meetings");
      }
    }
  }

  const filteredNotifications = (insights.notifications || []).filter((n) => {
    if (filterType === "all") return true;
    return n.type === filterType;
  });

  const groupedNotifications = filteredNotifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let group;
    if (date >= today) {
      group = "Today";
    } else if (date >= yesterday) {
      group = "Yesterday";
    } else if (date >= weekAgo) {
      group = "This Week";
    } else {
      group = "Older";
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(notif);
    return acc;
  }, {});

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 relative overflow-hidden">
          <AnimatedBackgroundDiff />
          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-700">Loading notifications...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const userRole = user?.role;
  // Find selected user from conversations (handle different userId formats)
  const selectedUser = selectedConversation 
    ? conversations.find(c => {
        const convUserId = c.userId?._id || c.userId?.id || c.userId;
        return convUserId?.toString() === selectedConversation?.toString();
      })
    : null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 relative overflow-hidden">
        <AnimatedBackgroundDiff />
        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-7xl pb-12">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                  <AuroraText
                    speed={2.5}
                    colors={["#38bdf8", "#6366F1", "#818CF8", "#9333EA", "#C084FC"]}
                  >
                    Notifications & Activity
                  </AuroraText>
                </h1>
                {isPolling && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Live</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Stay updated with your latest notifications and messages
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-6">
              {insights.unreadCount > 0 && activeTab === "activity" && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => {
                  const userId = user?._id || user?.id;
                  if (userId) {
                    loadInsights(userId);
                    if (user.role === "researcher") {
                      loadFollowers(userId);
                      loadConnectionRequests(userId);
                      loadConnections(userId);
                      loadConversations(userId);
                      loadMeetingRequests(userId);
                      loadResearcherUpcomingMeetings(userId);
                      if (selectedConversation) {
                        selectConversation(selectedConversation);
                      }
                    } else if (user.role === "patient") {
                      loadPatientMeetingRequests(userId);
                      loadUpcomingMeetings(userId);
                    }
                  }
                }}
                className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg font-medium transition-all border border-indigo-200 shadow-sm hover:shadow-md flex items-center gap-2"
                title="Refresh"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-2 bg-white rounded-xl shadow-md border border-slate-200 p-2">
              <button
                onClick={() => {
                  setActiveTab("activity");
                  setSelectedConversation(null);
                  setSearchParams({});
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium ${
                  activeTab === "activity"
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                    : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <Bell className="w-4 h-4" />
                Activity
                {insights.unreadCount > 0 && activeTab === "activity" && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {insights.unreadCount}
                  </span>
                )}
              </button>
              {/* Messages tab - only for researchers */}
              {userRole === "researcher" && (
                <button
                  onClick={() => {
                    setActiveTab("messages");
                    if (conversations.length > 0 && !selectedConversation) {
                      selectConversation(conversations[0].userId);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium ${
                    activeTab === "messages"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </button>
              )}
              {userRole === "researcher" && (
                <button
                  onClick={() => setActiveTab("followers")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium ${
                    activeTab === "followers"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Followers
                  {activeTab === "followers" && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {followers.length}
                    </span>
                  )}
                </button>
              )}
              {/* Connection Requests tab - only for researchers */}
              {userRole === "researcher" && (
                <button
                  onClick={() => setActiveTab("connection-requests")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium relative ${
                    activeTab === "connection-requests"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Connection Requests
                  {connectionRequests.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {connectionRequests.length}
                    </span>
                  )}
                </button>
              )}
              {/* Meeting Requests tab - only for researchers */}
              {userRole === "researcher" && (
                <button
                  onClick={() => setActiveTab("meeting-requests")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium relative ${
                    activeTab === "meeting-requests"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Meeting Requests
                  {meetingRequests.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {meetingRequests.length}
                    </span>
                  )}
                </button>
              )}
              {/* Upcoming Meetings tab - for both patients and researchers */}
              {(userRole === "patient" || userRole === "researcher") && (
                <button
                  onClick={() => setActiveTab("upcoming-meetings")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium ${
                    activeTab === "upcoming-meetings"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Upcoming Meetings
                  {upcomingMeetings.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {upcomingMeetings.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setActiveTab("metrics")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium ${
                  activeTab === "metrics"
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                    : "bg-slate-50 border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Metrics
              </button>
            </div>
          </div>

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
            {/* Filter */}
            <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-indigo-600" />
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "all"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("new_reply")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_reply"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                Replies
              </button>
              <button
                onClick={() => setFilterType("new_follower")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_follower"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setFilterType("new_message")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_message"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                Messages
              </button>
            </div>

            {/* Notifications */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {Object.keys(groupedNotifications).length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium text-lg mb-2">
                    No notifications yet
                  </p>
                  <p className="text-slate-600 text-sm">
                    Your activity and updates will appear here
                  </p>
                </div>
              ) : (
                Object.entries(groupedNotifications).map(([group, notifs]) => (
                  <div key={group}>
                    <div className="px-6 py-3 bg-indigo-50/50 border-b border-slate-100">
                      <h3 className="font-semibold text-indigo-800">{group}</h3>
                    </div>
                    {notifs.map((notif) => (
                      <div
                        key={notif._id}
                        className={`px-6 py-4 hover:bg-indigo-50/30 transition-all cursor-pointer ${
                          !notif.read ? "bg-indigo-50/30 border-l-4 border-indigo-500" : ""
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 mb-1">
                                  {notif.title}
                                </h4>
                                <p className="text-sm text-slate-700 mb-2">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(notif.createdAt)}
                                  </span>
                                  {notif.relatedUserId && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {notif.relatedUserId.username || "Someone"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notif.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif._id);
                                  }}
                                  className="px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-all border border-indigo-200"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages Tab - Chat Interface */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex animate-fade-in" style={{ height: "600px" }}>
            {/* Conversations List */}
            <div className="w-1/3 border-r border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-indigo-50/50">
                <h3 className="font-semibold text-indigo-900">Conversations</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  // Filter conversations to only show connected researchers
                  const connectedConversations = conversations.filter((conv) => {
                    if (!connections || connections.length === 0) return false;
                    const convUserId = conv.userId?._id || conv.userId?.id || conv.userId;
                    const convUserIdStr = convUserId?.toString();
                    
                    return connections.some((conn) => {
                      const connUserId = conn.userId?._id || conn.userId?.id || conn.userId;
                      const connUserIdStr = connUserId?.toString();
                      return connUserIdStr === convUserIdStr;
                    });
                  });

                  if (connectedConversations.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-medium text-sm mb-1">
                          {connections && connections.length > 0
                            ? "No messages with connected researchers yet"
                            : "No connected researchers to message"}
                        </p>
                        <p className="text-slate-600 text-xs">
                          {connections && connections.length > 0
                            ? "Start a conversation with your connections"
                            : "Connect with researchers to start messaging"}
                        </p>
                      </div>
                    );
                  }

                  return connectedConversations.map((conv) => {
                    const userId = conv.userId?._id || conv.userId?.id || conv.userId;
                    const userIdStr = userId?.toString();
                    return (
                      <button
                        key={userIdStr}
                        onClick={() => selectConversation(userIdStr)}
                        className={`w-full p-4 text-left hover:bg-indigo-50/50 transition-all border-b border-slate-100 ${
                          selectedConversation === userIdStr
                            ? "bg-indigo-50 border-l-4 border-indigo-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {conv.username?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {conv.username || "Unknown"}
                              </h4>
                              {conv.unreadCount > 0 && (
                                <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ml-2">
                                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-slate-600 truncate">
                                {typeof conv.lastMessage === "string"
                                  ? conv.lastMessage
                                  : conv.lastMessage.body || ""}
                              </p>
                            )}
                            {conv.lastMessage && conv.lastMessage.createdAt && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(conv.lastMessage.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {selectedUser?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {selectedUser?.username || "User"}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {selectedUser?.email || ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setSearchParams({});
                      }}
                      className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-indigo-50/20"
                    id="messages-container"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                        <p className="text-slate-700 font-medium">
                          No messages yet
                        </p>
                        <p className="text-slate-600 text-sm mt-1">
                          Start the conversation below
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        // Get sender ID - handle both populated and unpopulated cases
                        const senderId = msg.senderId?._id?.toString() || 
                                        msg.senderId?.id?.toString() || 
                                        msg.senderId?.toString() || 
                                        msg.senderId;
                        const currentUserId = (user?._id || user?.id)?.toString();
                        const isSender = senderId === currentUserId;
                        
                        return (
                          <div
                            key={msg._id || idx}
                            className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl p-3 ${
                                isSender
                                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                                  : "bg-indigo-50 text-slate-900 border border-indigo-100"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.body}
                              </p>
                              <p className={`text-xs mt-1 ${
                                isSender ? "text-indigo-100" : "text-slate-600"
                              }`}>
                                {formatDate(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                    <p className="text-slate-700 font-medium">
                      Select a conversation to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Requests Tab (Researchers only) */}
        {activeTab === "connection-requests" && userRole === "researcher" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-200 bg-indigo-50/50">
              <h2 className="text-2xl font-bold text-slate-900">
                Connection Requests ({connectionRequests.length})
              </h2>
              <p className="text-slate-600 text-sm mt-1">Accept or reject connection requests from other researchers</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {connectionRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <UserPlus className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium text-lg mb-2">
                    No pending connection requests
                  </p>
                  <p className="text-slate-600 text-sm">
                    Connection requests from other researchers will appear here
                  </p>
                </div>
              ) : (
                connectionRequests.map((request) => {
                  const requester = request.requesterId;
                  return (
                    <div key={request._id} className="p-6 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {requester?.username?.charAt(0)?.toUpperCase() || "R"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {requester?.username || "Unknown Researcher"}
                            </h4>
                            <p className="text-sm text-slate-700 mb-2">
                              {requester?.email || ""}
                            </p>
                            {request.message && (
                              <p className="text-sm text-slate-600 italic mb-2">
                                "{request.message}"
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptConnectionRequest(request._id)}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => rejectConnectionRequest(request._id)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Connections List */}
            {connections.length > 0 && (
              <>
                <div className="p-6 border-t-2 border-slate-200 bg-indigo-50/50">
                  <h3 className="text-xl font-bold text-slate-900">
                    Your Connections ({connections.length})
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">Researchers you're connected with</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {connections.map((connection) => (
                    <div key={connection._id} className="p-6 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {connection.username?.charAt(0)?.toUpperCase() || "R"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {connection.username}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Connected {formatDate(connection.connectedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActiveTab("messages");
                              selectConversation(connection.userId);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Message
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to disconnect from ${connection.username}?`)) {
                                disconnectConnection(connection._id);
                              }
                            }}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all border border-red-200 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Meeting Requests Tab (Researchers only) */}
        {activeTab === "meeting-requests" && userRole === "researcher" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-200 bg-indigo-50/50">
              <h2 className="text-2xl font-bold text-slate-900">
                Meeting Requests ({meetingRequests.length})
              </h2>
              <p className="text-slate-600 text-sm mt-1">Schedule meetings with patients who requested to meet you</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {meetingRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium text-lg mb-2">
                    No pending meeting requests
                  </p>
                  <p className="text-slate-600 text-sm">
                    Meeting requests from patients will appear here
                  </p>
                </div>
              ) : (
                meetingRequests.map((request) => {
                  const patient = request.patientId;
                  return (
                    <div key={request._id} className="p-6 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {patient?.username?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {patient?.username || "Unknown Patient"}
                            </h4>
                            <p className="text-sm text-slate-700 mb-2">
                              {request.message}
                            </p>
                            {request.preferredDate && (
                              <p className="text-xs text-slate-600 mb-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Preferred: {new Date(request.preferredDate).toLocaleDateString()}
                                {request.preferredTime && ` at ${request.preferredTime}`}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAcceptMeetingModal({
                                open: true,
                                requestId: request._id,
                                meetingDate: request.preferredDate ? new Date(request.preferredDate).toISOString().slice(0, 16) : "",
                                meetingNotes: "",
                              });
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Accept & Schedule
                          </button>
                          <button
                            onClick={() => rejectMeetingRequest(request._id)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Upcoming Meetings Tab (Patients and Researchers) */}
        {activeTab === "upcoming-meetings" && (userRole === "patient" || userRole === "researcher") && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-200 bg-indigo-50/50">
              <h2 className="text-2xl font-bold text-slate-900">
                Upcoming Meetings ({upcomingMeetings.length})
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {userRole === "patient" 
                  ? "Your scheduled meetings with experts" 
                  : "Your scheduled meetings with patients"}
              </p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {upcomingMeetings.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium text-lg mb-2">
                    No upcoming meetings
                  </p>
                  <p className="text-slate-600 text-sm">
                    Your accepted meeting requests will appear here
                  </p>
                </div>
              ) : (
                upcomingMeetings.map((meeting) => {
                  // For patients, expert is expertId; for researchers, patient is patientId
                  const otherPerson = userRole === "patient" ? meeting.expertId : meeting.patientId;
                  const meetingDate = new Date(meeting.meetingDate || meeting.preferredDate);
                  const isExpired = meetingDate < new Date();
                  return (
                    <div key={meeting._id} className={`p-6 hover:bg-indigo-50/30 transition-all ${isExpired ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {otherPerson?.username?.charAt(0)?.toUpperCase() || (userRole === "patient" ? "E" : "P")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">
                                Meeting with {otherPerson?.username || (userRole === "patient" ? "Expert" : "Patient")}
                              </h4>
                              {isExpired && (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-xs rounded-full font-medium">
                                  Expired
                                </span>
                              )}
                            </div>
                            {meeting.meetingDate && (
                              <p className="text-sm text-slate-700 mb-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {meetingDate.toLocaleString()}
                              </p>
                            )}
                            {meeting.meetingNotes && (
                              <p className="text-sm text-slate-600 italic mb-2">
                                Notes: {meeting.meetingNotes}
                              </p>
                            )}
                            {meeting.message && (
                              <p className="text-sm text-slate-600 mb-2">
                                {meeting.message}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              Status: {meeting.status === "accepted" ? "Accepted" : meeting.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* All Meeting Requests Status - only show for patients */}
            {userRole === "patient" && meetingRequests.length > 0 && (
              <>
                <div className="p-6 border-t-2 border-slate-200 bg-indigo-50/50">
                  <h3 className="text-xl font-bold text-slate-900">
                    All Meeting Requests
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {meetingRequests.map((request) => {
                    const expert = request.expertId;
                    return (
                      <div key={request._id} className="p-6 hover:bg-indigo-50/30 transition-all">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {expert?.username?.charAt(0)?.toUpperCase() || "E"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {expert?.username || "Expert"}
                              </h4>
                              <p className="text-xs text-slate-600 mb-1">
                                {request.message}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div>
                            {request.status === "pending" && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200">
                                Pending
                              </span>
                            )}
                            {request.status === "accepted" && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">
                                Accepted
                              </span>
                            )}
                            {request.status === "rejected" && (
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Followers Tab (Researchers only) */}
        {activeTab === "followers" && userRole === "researcher" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Your Followers ({followers.length})
            </h2>
            {followers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <p className="text-slate-700 font-medium text-lg mb-2">
                  No followers yet
                </p>
                <p className="text-slate-600 text-sm">
                  Share your expertise and people will start following you!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followers.map((follower, idx) => (
                  <div
                    key={follower._id}
                    className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 bg-white"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {follower.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {follower.username}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {formatDate(follower.followedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("messages");
                        selectConversation(follower._id);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRole === "patient" ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.threadsCreated || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Threads Created</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Reply className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.repliesCreated || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Replies Posted</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <ThumbsUp className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.totalUpvotes || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Total Upvotes</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Eye className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.threadViews || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Thread Views</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.followers || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Followers</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Beaker className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.trialsCreated || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Trials Created</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.threadsCreated || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Threads Created</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Reply className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.repliesCreated || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Replies Posted</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <ThumbsUp className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.totalUpvotes || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Total Upvotes</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <Heart className="w-8 h-8 text-indigo-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {insights.metrics.trialFavorites || 0}
                  </h3>
                  <p className="text-slate-700 font-medium">Trial Favorites</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Accept Meeting Modal */}
        {acceptMeetingModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Schedule Meeting
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Meeting Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={acceptMeetingModal.meetingDate}
                    onChange={(e) =>
                      setAcceptMeetingModal({
                        ...acceptMeetingModal,
                        meetingDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Meeting Notes (Optional)
                  </label>
                  <textarea
                    value={acceptMeetingModal.meetingNotes}
                    onChange={(e) =>
                      setAcceptMeetingModal({
                        ...acceptMeetingModal,
                        meetingNotes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add any notes about the meeting..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() =>
                      acceptMeetingRequest(
                        acceptMeetingModal.requestId,
                        acceptMeetingModal.meetingDate,
                        acceptMeetingModal.meetingNotes
                      )
                    }
                    disabled={!acceptMeetingModal.meetingDate}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Schedule Meeting
                  </button>
                  <button
                    onClick={() =>
                      setAcceptMeetingModal({
                        open: false,
                        requestId: null,
                        meetingDate: "",
                        meetingNotes: "",
                      })
                    }
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      </div>
    </Layout>
  );
}

