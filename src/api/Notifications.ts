import { type Notification, type NotificationCategory, type PaginatedResponse } from '../types';

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Medical Fitness to Work Updates January 1, 2026',
    content: 'The **Acceptable Medication List**, a component of the Offshore Medication Screening Process, has been updated. The **Acceptable Medication List** went live on **January 1, 2026.**\n\nPlease refer to the "Medical Fitness to Work" document on the sidebar to learn more.',
    category: 'red',
    created_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: '2',
    title: 'Personal Electronic Device (PED) Restrictions starting October 1, 2025',
    content: 'Dear Partners in Safety,\n\nEffective October 1, 2025, new restrictions on the transportation of personal electronic devices (PEDs) by aircraft will be implemented to minimize the risks associated with lithium battery fires.\n\n**Effective October 1, 2025, e-cigarettes/vapes and power banks will not be permitted on helicopter flights.**\n\n- Laptops and tablets shall be completely switched OFF to avoid the battery overheating.\n- Laptops and tablets shall be transported in a protective case or packaging.\n- Mobile phones, earbuds, fitness trackers, and smart watches shall be switched OFF (if possible) and carried in a protective case on the passenger.',
    category: 'yellow',
    created_at: '2025-10-01T08:00:00.000Z',
  },
  {
    id: '3',
    title: 'REAL ID Required starting May 7th, 2025',
    content: 'Effective May 7, 2025, the Transportation Security Administration (TSA) will require passengers traveling by air to identify themselves using a REAL ID. This applies to all passengers traveling on contracted aircraft in the United States.\n\n**Passengers who do not present an acceptable form of REAL ID-compliant identification will be denied air transport.**',
    category: 'blue',
    created_at: '2025-05-07T08:00:00.000Z',
  },
];

function getStoredNotifications(): Notification[] {
  const stored = localStorage.getItem('lng_notifications');
  if (!stored) {
    localStorage.setItem('lng_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveNotifications(notifs: Notification[]) {
  localStorage.setItem('lng_notifications', JSON.stringify(notifs));
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  await delay(400); // simulate network latency
  const all = getStoredNotifications();
  let filtered = [...all];

  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  // Sort by created_at desc (newest first)
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const pagedData = filtered.slice(start, end);

  return {
    data: pagedData,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  } as PaginatedResponse<Notification>;
};

export const createNotification = async (data: {
  title: string;
  content: string;
  category: NotificationCategory;
}) => {
  await delay(500); // simulate network latency
  const all = getStoredNotifications();
  const newNotif: Notification = {
    id: Math.random().toString(36).substring(2, 9),
    title: data.title,
    content: data.content,
    category: data.category,
    created_at: new Date().toISOString(),
  };
  all.unshift(newNotif);
  saveNotifications(all);
  return newNotif;
};

export const deleteNotification = async (id: string) => {
  await delay(300); // simulate network latency
  const all = getStoredNotifications();
  const filtered = all.filter((n) => n.id !== id);
  saveNotifications(filtered);
  return { success: true };
};

export const getNotificationById = async (id: string) => {
  await delay(200); // simulate network latency
  const all = getStoredNotifications();
  return all.find((n) => n.id === id) || null;
};

export const updateNotification = async (
  id: string,
  data: { title: string; content: string; category: NotificationCategory }
) => {
  await delay(400); // simulate network latency
  const all = getStoredNotifications();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error('Notification not found');
  all[idx] = { ...all[idx], ...data };
  saveNotifications(all);
  return all[idx];
};

