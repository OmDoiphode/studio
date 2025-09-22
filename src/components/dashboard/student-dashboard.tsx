'use client';

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc } from 'firebase/firestore';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const enrollSchema = z.object({
  classCode: z.string().min(6, 'Class code must be at least 6 characters.'),
});

const studentDetailsSchema = z.object({
  rollNumber: z.string().min(1, 'Roll number is required.'),
});

export default function StudentDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [foundClass, setFoundClass] = useState<{ id: string; name: string } | null>(null);

  const enrollForm = useForm<z.infer<typeof enrollSchema>>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { classCode: '' },
  });

  const studentDetailsForm = useForm<z.infer<typeof studentDetailsSchema>>({
    resolver: zodResolver(studentDetailsSchema),
    defaultValues: { rollNumber: '' },
  });

  async function handleEnroll(values: z.infer<typeof enrollSchema>) {
    setIsLoading(true);
    const q = query(collection(db, 'classes'), where('classCode', '==', values.classCode));
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Class Not Found',
          description: 'No class found with that code. Please check and try again.',
        });
        return;
      }
      const classDoc = querySnapshot.docs[0];
      setFoundClass({ id: classDoc.id, name: classDoc.data().className });
      setShowDetailsModal(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStudentDetailsSubmit(values: z.infer<typeof studentDetailsSchema>) {
    if (!foundClass || !userProfile) return;
    setIsLoading(true);

    try {
      const studentsCollectionRef = collection(db, 'classes', foundClass.id, 'students');
      
      // Check if student is already enrolled
      const studentQuery = query(studentsCollectionRef, where("rollNumber", "==", values.rollNumber));
      const studentQuerySnapshot = await getDocs(studentQuery);
      if(!studentQuerySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Already Enrolled',
          description: 'A student with this roll number is already in the class.',
        });
        return;
      }
      
      await addDoc(studentsCollectionRef, {
        name: userProfile.name,
        rollNumber: values.rollNumber,
        uid: userProfile.uid,
        attendanceHistory: [],
      });
      toast({
        title: 'Enrollment Successful!',
        description: `You have been enrolled in ${foundClass.name}.`,
      });
      setShowDetailsModal(false);
      enrollForm.reset();
      studentDetailsForm.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Enrollment Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userProfile?.name}! Enroll in your classes here.</p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Enroll in a New Class</CardTitle>
          <CardDescription>Enter the class code provided by your faculty.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...enrollForm}>
            <form onSubmit={enrollForm.handleSubmit(handleEnroll)} className="space-y-4">
              <FormField
                control={enrollForm.control}
                name="classCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AB12CD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Find Class
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in {foundClass?.name}</DialogTitle>
            <DialogDescription>
              Please confirm your roll number to complete the enrollment. Your name will be recorded as {userProfile?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...studentDetailsForm}>
            <form onSubmit={studentDetailsForm.handleSubmit(handleStudentDetailsSubmit)} className="space-y-4">
              <FormField
                control={studentDetailsForm.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Enrollment
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
