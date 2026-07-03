import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: "active" | "inactive" | "prospect";
  revenue: number;
  tags: string[];
  notes: string;
  lastContact: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  dueDate: string;
  clientId?: string;
  projectId?: string;
  aiGenerated: boolean;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  clientId: string;
  value: number;
  stage: "lead" | "proposal" | "negotiation" | "won" | "lost";
  probability: number;
  expectedClose: string;
  notes: string;
  createdAt: string;
}

export interface EmailItem {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  folder: "inbox" | "sent" | "drafts" | "archive";
  aiReply?: string;
  priority: "high" | "normal" | "low";
  clientId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  clientId?: string;
  date: string;
  duration: number;
  platform: "zoom" | "meet" | "teams" | "in_person";
  agenda: string;
  notes: string;
  summary?: string;
  actionItems: string[];
  status: "upcoming" | "completed" | "cancelled";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "urgent";
  read: boolean;
  timestamp: string;
  action?: string;
}

export interface AppState {
  clients: Client[];
  tasks: Task[];
  deals: Deal[];
  emails: EmailItem[];
  meetings: Meeting[];
  notifications: Notification[];
  revenue: number;
  expenses: number;
  aiMemory: string[];
}

interface AppContextType extends AppState {
  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addDeal: (deal: Omit<Deal, "id" | "createdAt">) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  addMeeting: (meeting: Omit<Meeting, "id">) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  markEmailRead: (id: string) => void;
  markNotificationRead: (id: string) => void;
  addAiMemory: (memory: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const SAMPLE_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Sarah Chen",
    email: "sarah@techventures.io",
    company: "TechVentures Inc.",
    phone: "+1 (415) 555-0142",
    status: "active",
    revenue: 48500,
    tags: ["enterprise", "saas", "priority"],
    notes: "Key decision maker. Prefers morning calls. Budget approved for Q2.",
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: "SC",
  },
  {
    id: "c2",
    name: "Marcus Williams",
    email: "marcus@growthlab.co",
    company: "GrowthLab Agency",
    phone: "+1 (310) 555-0198",
    status: "active",
    revenue: 32000,
    tags: ["agency", "recurring"],
    notes: "Monthly retainer. Expanding team in Q3.",
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: "MW",
  },
  {
    id: "c3",
    name: "Elena Rodriguez",
    email: "elena@nexuscorp.com",
    company: "Nexus Corporation",
    phone: "+1 (212) 555-0167",
    status: "prospect",
    revenue: 0,
    tags: ["enterprise", "new"],
    notes: "Came via LinkedIn. High potential deal worth $75K+.",
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: "ER",
  },
];

const SAMPLE_TASKS: Task[] = [
  {
    id: "t1",
    title: "Send Q2 proposal to TechVentures",
    description: "Prepare and send the revised Q2 service proposal",
    priority: "high",
    status: "todo",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: "c1",
    aiGenerated: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "t2",
    title: "Follow up with GrowthLab on contract renewal",
    description: "Contract expires in 30 days. Initiate renewal discussion.",
    priority: "high",
    status: "in_progress",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: "c2",
    aiGenerated: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "t3",
    title: "Prepare Nexus discovery call agenda",
    description: "Research company, prepare questions for initial call",
    priority: "medium",
    status: "todo",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: "c3",
    aiGenerated: false,
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_DEALS: Deal[] = [
  {
    id: "d1",
    title: "TechVentures Q2 Enterprise Package",
    clientId: "c1",
    value: 48500,
    stage: "negotiation",
    probability: 75,
    expectedClose: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Legal review in progress. Decision by end of month.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "d2",
    title: "GrowthLab Annual Retainer Renewal",
    clientId: "c2",
    value: 38400,
    stage: "proposal",
    probability: 85,
    expectedClose: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Renewal with 20% price increase proposed.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "d3",
    title: "Nexus Corporation Discovery",
    clientId: "c3",
    value: 75000,
    stage: "lead",
    probability: 25,
    expectedClose: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Initial contact made. High value opportunity.",
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_EMAILS: EmailItem[] = [
  {
    id: "e1",
    from: "sarah@techventures.io",
    fromName: "Sarah Chen",
    subject: "Re: Q2 Proposal - Request for revision",
    preview: "Hi, thanks for the proposal. We need to adjust the timeline for deliverable 3...",
    body: "Hi,\n\nThanks for sending over the Q2 proposal. We've reviewed it internally and everything looks great. However, we need to adjust the timeline for deliverable 3 — our team has a major product launch in June that will consume most of our bandwidth.\n\nCould you push deliverable 3 to July 15th instead? Budget-wise we're aligned with the numbers.\n\nLet me know if this works.\n\nBest,\nSarah",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    folder: "inbox",
    priority: "high",
    clientId: "c1",
    aiReply: "Hi Sarah,\n\nThank you for the feedback on the Q2 proposal — glad the numbers work for you. Absolutely, we can adjust deliverable 3 to July 15th. I'll update the agreement and send you a revised version by tomorrow EOD.\n\nLooking forward to moving this forward!\n\nBest regards",
  },
  {
    id: "e2",
    from: "marcus@growthlab.co",
    fromName: "Marcus Williams",
    subject: "Monthly report - need by Friday",
    preview: "Hey, just a reminder that I'll need the monthly performance report by Friday...",
    body: "Hey,\n\nJust a reminder that I'll need the monthly performance report by Friday COB. The board meeting is Monday morning and I need to prep the deck over the weekend.\n\nAlso, can you include the Q2 projections this time?\n\nThanks,\nMarcus",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
    folder: "inbox",
    priority: "high",
    clientId: "c2",
    aiReply: "Hi Marcus,\n\nAbsolutely — the monthly performance report will be in your inbox by Friday at 5pm. I'll include the Q2 projections as you requested. If there are any specific metrics or KPIs you'd like highlighted for the board, let me know by Thursday and I'll make sure they're featured prominently.\n\nBest,",
  },
  {
    id: "e3",
    from: "elena@nexuscorp.com",
    fromName: "Elena Rodriguez",
    subject: "Interested in your services",
    preview: "I came across your profile on LinkedIn and I'm interested in exploring...",
    body: "Hello,\n\nI came across your profile on LinkedIn and I'm very interested in exploring how you might be able to help Nexus Corporation. We're a Series B company with about 200 employees and we're looking to scale our operations significantly over the next 18 months.\n\nWould you be available for a 30-minute discovery call next week?\n\nBest,\nElena Rodriguez\nVP of Operations, Nexus Corporation",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    folder: "inbox",
    priority: "normal",
    clientId: "c3",
    aiReply: "Hi Elena,\n\nThank you for reaching out — Nexus Corporation's growth story sounds incredibly exciting, and I'd love to explore how we can support your scale-up journey.\n\nI'm available for a discovery call any of these times next week:\n• Tuesday, 10am-12pm EST\n• Wednesday, 2pm-4pm EST  \n• Thursday, 9am-11am EST\n\nPlease pick whichever works best for you, and I'll send a calendar invite with a Zoom link.\n\nLooking forward to connecting!\n\nBest regards,",
  },
];

const SAMPLE_MEETINGS: Meeting[] = [
  {
    id: "m1",
    title: "TechVentures Q2 Contract Review",
    clientId: "c1",
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    platform: "zoom",
    agenda: "1. Review revised Q2 proposal\n2. Discuss timeline adjustments\n3. Address legal concerns\n4. Next steps & signing",
    notes: "",
    actionItems: [],
    status: "upcoming",
  },
  {
    id: "m2",
    title: "Nexus Corporation Discovery Call",
    clientId: "c3",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    platform: "meet",
    agenda: "1. Company overview\n2. Current pain points\n3. Our solution overview\n4. Q&A",
    notes: "",
    actionItems: [],
    status: "upcoming",
  },
];

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "AI Action Required",
    message: "Sarah Chen replied to your proposal. AI suggests approving the timeline change.",
    type: "urgent",
    read: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    action: "review_email",
  },
  {
    id: "n2",
    title: "Deal Alert",
    message: "GrowthLab contract expires in 30 days. Renewal discussion initiated by AI.",
    type: "warning",
    read: false,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    action: "view_deal",
  },
  {
    id: "n3",
    title: "New Lead Qualified",
    message: "Nexus Corporation scored 82/100. High probability deal — AI created follow-up task.",
    type: "success",
    read: false,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action: "view_client",
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    clients: SAMPLE_CLIENTS,
    tasks: SAMPLE_TASKS,
    deals: SAMPLE_DEALS,
    emails: SAMPLE_EMAILS,
    meetings: SAMPLE_MEETINGS,
    notifications: SAMPLE_NOTIFICATIONS,
    revenue: 187400,
    expenses: 42300,
    aiMemory: [
      "Sarah Chen prefers morning calls (9-11am PST)",
      "Marcus Williams needs reports by Friday for Monday board meetings",
      "TechVentures has a product launch in June — avoid scheduling conflicts",
      "GrowthLab agreed to 20% price increase on renewal",
    ],
  });

  useEffect(() => {
    AsyncStorage.getItem("appState").then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState(parsed);
        } catch {}
      }
    });
  }, []);

  const persist = (newState: AppState) => {
    AsyncStorage.setItem("appState", JSON.stringify(newState));
  };

  const addClient = (client: Omit<Client, "id">) => {
    setState((prev) => {
      const next = { ...prev, clients: [...prev.clients, { ...client, id: generateId() }] };
      persist(next);
      return next;
    });
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setState((prev) => {
      const next = { ...prev, clients: prev.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)) };
      persist(next);
      return next;
    });
  };

  const deleteClient = (id: string) => {
    setState((prev) => {
      const next = { ...prev, clients: prev.clients.filter((c) => c.id !== id) };
      persist(next);
      return next;
    });
  };

  const addTask = (task: Omit<Task, "id" | "createdAt">) => {
    setState((prev) => {
      const next = { ...prev, tasks: [...prev.tasks, { ...task, id: generateId(), createdAt: new Date().toISOString() }] };
      persist(next);
      return next;
    });
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setState((prev) => {
      const next = { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) };
      persist(next);
      return next;
    });
  };

  const deleteTask = (id: string) => {
    setState((prev) => {
      const next = { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) };
      persist(next);
      return next;
    });
  };

  const addDeal = (deal: Omit<Deal, "id" | "createdAt">) => {
    setState((prev) => {
      const next = { ...prev, deals: [...prev.deals, { ...deal, id: generateId(), createdAt: new Date().toISOString() }] };
      persist(next);
      return next;
    });
  };

  const updateDeal = (id: string, updates: Partial<Deal>) => {
    setState((prev) => {
      const next = { ...prev, deals: prev.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)) };
      persist(next);
      return next;
    });
  };

  const addMeeting = (meeting: Omit<Meeting, "id">) => {
    setState((prev) => {
      const next = { ...prev, meetings: [...prev.meetings, { ...meeting, id: generateId() }] };
      persist(next);
      return next;
    });
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    setState((prev) => {
      const next = { ...prev, meetings: prev.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)) };
      persist(next);
      return next;
    });
  };

  const markEmailRead = (id: string) => {
    setState((prev) => {
      const next = { ...prev, emails: prev.emails.map((e) => (e.id === id ? { ...e, read: true } : e)) };
      persist(next);
      return next;
    });
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => {
      const next = { ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) };
      persist(next);
      return next;
    });
  };

  const addAiMemory = (memory: string) => {
    setState((prev) => {
      const next = { ...prev, aiMemory: [memory, ...prev.aiMemory].slice(0, 50) };
      persist(next);
      return next;
    });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addClient,
        updateClient,
        deleteClient,
        addTask,
        updateTask,
        deleteTask,
        addDeal,
        updateDeal,
        addMeeting,
        updateMeeting,
        markEmailRead,
        markNotificationRead,
        addAiMemory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
