import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type TeacherApprovalStatus = "pending" | "approved" | "rejected";

export interface Credential {
  id: string;
  type: string;
  uri: string;
  name: string;
  uploadedAt: string;
}

export interface Review {
  id: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: "teacher";
  subject: string;
  subjects: string[];
  bio: string;
  approvalStatus: TeacherApprovalStatus;
  credentials: Credential[];
  rating: number;
  reviewCount: number;
  subscriptionActive: boolean;
  sessionsThisMonth: number;
  totalStudents: number;
  monthlyEarnings: number;
  avatarUrl?: string;
  location?: string;
  district?: string;
  experienceYears?: number;
  pricePerSession?: number;
  languages?: string[];
  isOnline?: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  role: "student";
  grade: string;
  bio?: string;
  enrolledSessions: string[];
  avatarUrl?: string;
}

export type User = Teacher | Student;

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "teacher" | "student";
  subject?: string;
  bio?: string;
  grade?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: "teacher" | "student") => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const STORAGE_KEY = "@sikshya_user";
export const TEACHERS_KEY = "@sikshya_teachers";
export const SESSIONS_KEY = "@sikshya_sessions";
export const REVIEWS_KEY = "@sikshya_reviews";

export const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: "teacher_1",
    name: "Ram Prasad Sharma",
    email: "ram@example.com",
    role: "teacher",
    subject: "Mathematics",
    subjects: ["Algebra", "Calculus", "Statistics"],
    bio: "Experienced mathematics teacher with 15 years of teaching at higher secondary level. Specializes in making complex concepts simple and accessible for SEE and +2 students.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.8,
    reviewCount: 124,
    subscriptionActive: true,
    sessionsThisMonth: 7,
    totalStudents: 45,
    monthlyEarnings: 28000,
    location: "Kathmandu",
    district: "Kathmandu",
    experienceYears: 15,
    pricePerSession: 500,
    languages: ["Nepali", "English"],
    isOnline: true,
  },
  {
    id: "teacher_2",
    name: "Sunita Thapa",
    email: "sunita@example.com",
    role: "teacher",
    subject: "Science",
    subjects: ["Physics", "Chemistry", "Biology"],
    bio: "Senior science teacher from Kathmandu. Former lecturer at Tribhuvan University. Passionate about making science experiments and theory equally accessible to all students.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.6,
    reviewCount: 89,
    subscriptionActive: true,
    sessionsThisMonth: 5,
    totalStudents: 32,
    monthlyEarnings: 18500,
    location: "Lalitpur",
    district: "Lalitpur",
    experienceYears: 11,
    pricePerSession: 450,
    languages: ["Nepali", "English"],
    isOnline: false,
  },
  {
    id: "teacher_3",
    name: "Bishnu Bahadur Rai",
    email: "bishnu@example.com",
    role: "teacher",
    subject: "English",
    subjects: ["Grammar", "Literature", "Spoken English", "IELTS Preparation"],
    bio: "IELTS certified English teacher based in Pokhara. Has helped over 200 students achieve their target band scores. Expert in spoken English and essay writing.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.9,
    reviewCount: 203,
    subscriptionActive: true,
    sessionsThisMonth: 9,
    totalStudents: 67,
    monthlyEarnings: 42000,
    location: "Pokhara",
    district: "Kaski",
    experienceYears: 12,
    pricePerSession: 600,
    languages: ["Nepali", "English", "Maithili"],
    isOnline: true,
  },
  {
    id: "teacher_4",
    name: "Priya Acharya",
    email: "priya@example.com",
    role: "teacher",
    subject: "Nepali",
    subjects: ["Nepali Literature", "Grammar", "Essay Writing", "Poetry Analysis"],
    bio: "Nepali language and literature expert based in Bhaktapur. Graduate from Tribhuvan University with distinction. Focuses on deep comprehension and creative writing.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.5,
    reviewCount: 56,
    subscriptionActive: true,
    sessionsThisMonth: 4,
    totalStudents: 28,
    monthlyEarnings: 14000,
    location: "Bhaktapur",
    district: "Bhaktapur",
    experienceYears: 8,
    pricePerSession: 350,
    languages: ["Nepali"],
    isOnline: false,
  },
  {
    id: "teacher_5",
    name: "Kiran Tamang",
    email: "kiran@example.com",
    role: "teacher",
    subject: "Computer Science",
    subjects: ["Programming", "Web Development", "Database", "Python", "JavaScript"],
    bio: "Software engineer turned educator from Chitwan. Teaching programming and computer science for 8 years. Former backend developer at a Kathmandu fintech startup.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.7,
    reviewCount: 142,
    subscriptionActive: true,
    sessionsThisMonth: 8,
    totalStudents: 54,
    monthlyEarnings: 35000,
    location: "Chitwan",
    district: "Chitwan",
    experienceYears: 8,
    pricePerSession: 550,
    languages: ["Nepali", "English"],
    isOnline: true,
  },
  {
    id: "teacher_6",
    name: "Meena Karki",
    email: "meena@example.com",
    role: "teacher",
    subject: "Mathematics",
    subjects: ["Arithmetic", "Algebra", "Geometry", "Trigonometry"],
    bio: "Dedicated math tutor from Biratnagar with a passion for foundational skills. Specialises in helping struggling students build confidence in mathematics.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.4,
    reviewCount: 38,
    subscriptionActive: true,
    sessionsThisMonth: 3,
    totalStudents: 19,
    monthlyEarnings: 9500,
    location: "Biratnagar",
    district: "Morang",
    experienceYears: 5,
    pricePerSession: 300,
    languages: ["Nepali", "Maithili"],
    isOnline: false,
  },
  {
    id: "teacher_7",
    name: "Deepak Pandey",
    email: "deepak@example.com",
    role: "teacher",
    subject: "History",
    subjects: ["Ancient History", "Modern Nepal", "World History", "Social Studies"],
    bio: "History enthusiast and educator from Butwal. MA in History from TU. Makes history come alive through storytelling and contemporary connections.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.3,
    reviewCount: 29,
    subscriptionActive: true,
    sessionsThisMonth: 2,
    totalStudents: 15,
    monthlyEarnings: 7500,
    location: "Butwal",
    district: "Rupandehi",
    experienceYears: 6,
    pricePerSession: 280,
    languages: ["Nepali", "Hindi"],
    isOnline: true,
  },
  {
    id: "teacher_8",
    name: "Anita Gurung",
    email: "anita@example.com",
    role: "teacher",
    subject: "Science",
    subjects: ["Biology", "Botany", "Zoology", "Environmental Science"],
    bio: "Biology specialist from Dharan with a BSc in Life Sciences. Known for practical demonstrations and helping students prepare for medical entrance exams.",
    approvalStatus: "approved",
    credentials: [],
    rating: 4.6,
    reviewCount: 74,
    subscriptionActive: true,
    sessionsThisMonth: 6,
    totalStudents: 38,
    monthlyEarnings: 22000,
    location: "Dharan",
    district: "Sunsari",
    experienceYears: 9,
    pricePerSession: 480,
    languages: ["Nepali", "English", "Limbu"],
    isOnline: true,
  },
];

export const SAMPLE_SESSIONS = [
  {
    id: "session_1",
    teacherId: "teacher_1",
    teacherName: "Ram Prasad Sharma",
    subject: "Mathematics",
    topic: "Calculus: Derivatives & Integration",
    date: new Date(Date.now() + 2 * 3600000).toISOString(),
    duration: 60,
    maxStudents: 20,
    enrolledStudents: ["student_demo1", "student_demo2", "student_demo3"],
    price: 500,
    status: "upcoming",
  },
  {
    id: "session_2",
    teacherId: "teacher_3",
    teacherName: "Bishnu Bahadur Rai",
    subject: "English",
    topic: "IELTS Writing Task 2 – Essay Structure",
    date: new Date(Date.now() + 24 * 3600000).toISOString(),
    duration: 60,
    maxStudents: 15,
    enrolledStudents: ["student_demo1"],
    price: 600,
    status: "upcoming",
  },
  {
    id: "session_3",
    teacherId: "teacher_2",
    teacherName: "Sunita Thapa",
    subject: "Science",
    topic: "Newton's Laws of Motion",
    date: new Date(Date.now() - 3600000).toISOString(),
    duration: 60,
    maxStudents: 20,
    enrolledStudents: ["student_demo1", "student_demo2"],
    price: 450,
    status: "live",
  },
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  updateUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    seedData();
  }, []);

  const seedData = async () => {
    const existingTeachers = await AsyncStorage.getItem(TEACHERS_KEY);
    if (!existingTeachers) {
      await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(SAMPLE_TEACHERS));
    }
    const existingSessions = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!existingSessions) {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(SAMPLE_SESSIONS));
    }
  };

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch (_e) {
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string, role: "teacher" | "student"): Promise<boolean> => {
    try {
      if (role === "teacher") {
        const teachersStr = await AsyncStorage.getItem(TEACHERS_KEY);
        const teachers: Teacher[] = teachersStr ? JSON.parse(teachersStr) : SAMPLE_TEACHERS;
        const found = teachers.find((t) => t.email.toLowerCase() === email.toLowerCase());
        if (found) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(found));
          setUser(found);
          return true;
        }
        const newTeacher: Teacher = {
          id: "teacher_" + Date.now(),
          name: email.split("@")[0] ?? "Teacher",
          email,
          role: "teacher",
          subject: "General",
          subjects: [],
          bio: "",
          approvalStatus: "pending",
          credentials: [],
          rating: 0,
          reviewCount: 0,
          subscriptionActive: false,
          sessionsThisMonth: 0,
          totalStudents: 0,
          monthlyEarnings: 0,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTeacher));
        setUser(newTeacher);
        return true;
      } else {
        const newStudent: Student = {
          id: "student_" + Date.now(),
          name: email.split("@")[0] ?? "Student",
          email,
          role: "student",
          grade: "Grade 10",
          enrolledSessions: ["session_3"],
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStudent));
        setUser(newStudent);
        return true;
      }
    } catch (_e) {
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      let newUser: User;
      if (data.role === "teacher") {
        newUser = {
          id: "teacher_" + Date.now(),
          name: data.name,
          email: data.email,
          role: "teacher",
          subject: data.subject ?? "General",
          subjects: data.subject ? [data.subject] : [],
          bio: data.bio ?? "",
          approvalStatus: "pending",
          credentials: [],
          rating: 0,
          reviewCount: 0,
          subscriptionActive: false,
          sessionsThisMonth: 0,
          totalStudents: 0,
          monthlyEarnings: 0,
        };
      } else {
        newUser = {
          id: "student_" + Date.now(),
          name: data.name,
          email: data.email,
          role: "student",
          grade: data.grade ?? "Grade 10",
          enrolledSessions: [],
        };
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      return true;
    } catch (_e) {
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates } as User;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
