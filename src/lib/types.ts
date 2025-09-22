import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'faculty' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ClassData {
  id: string;
  className: string;
  classCode: string;
  facultyId: string;
}

export interface StudentData {
  id: string;
  name: string;
  rollNumber: string;
  attendanceHistory: string[]; // dates as 'YYYY-MM-DD'
}
