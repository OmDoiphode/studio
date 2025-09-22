'use client';

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { ClassData } from '@/lib/types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BookCopy, Loader2, PlusCircle } from 'lucide-react';

export default function FacultyDashboard() {
  const { userProfile } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    setLoading(true);
    const q = query(
      collection(db, 'classes'),
      where('facultyId', '==', userProfile.uid)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const classesData: ClassData[] = [];
      querySnapshot.forEach((doc) => {
        classesData.push({ id: doc.id, ...doc.data() } as ClassData);
      });
      setClasses(classesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Faculty Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userProfile?.name}! Manage your classes here.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <Link href="/create-class">
          <Card className="h-full hover:border-primary transition-all flex flex-col items-center justify-center text-center p-6">
              <PlusCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold font-headline">Create a New Class</h3>
              <p className="text-muted-foreground text-sm">Set up a new class for attendance tracking.</p>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <BookCopy className="h-5 w-5"/>
            My Classes
          </CardTitle>
          <CardDescription>Here is a list of all classes you have created.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : classes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <Link key={c.id} href={`/class/${c.classCode}`}>
                  <Card className="hover:shadow-md hover:border-primary transition-all">
                    <CardHeader>
                      <CardTitle className="font-headline text-lg">{c.className}</CardTitle>
                      <CardDescription>Code: <span className="font-mono font-medium text-foreground bg-muted px-2 py-1 rounded-md">{c.classCode}</span></CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">You haven&apos;t created any classes yet.</p>
                <Button asChild variant="link" className="mt-2 text-primary">
                    <Link href="/create-class">Create your first class</Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
