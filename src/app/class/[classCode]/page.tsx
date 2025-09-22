'use client';

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  addDoc,
} from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ClassData, StudentData, UserProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BookCopy,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  Terminal,
  UserPlus,
  Users,
  Bot,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { summarizeAttendance } from '@/ai/flows/attendance-summarization';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const studentFormSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  rollNumber: z.string().min(1, 'Roll number is required.'),
});

export default function ClassPage() {
  const { classCode } = useParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
  const [checkedStudents, setCheckedStudents] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryDateRange, setSummaryDateRange] = useState<{from: Date, to: Date}>({ from: subDays(new Date(), 7), to: new Date() });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  
  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { name: '', rollNumber: '' },
  });


  useEffect(() => {
    if (typeof classCode !== 'string') return;
    const q = query(collection(db, 'classes'), where('classCode', '==', classCode));

    getDocs(q)
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          notFound();
          return;
        }
        const classDoc = querySnapshot.docs[0];
        const data = { id: classDoc.id, ...classDoc.data() } as ClassData;
        setClassData(data);

        const studentsCollectionRef = collection(db, 'classes', classDoc.id, 'students');
        const unsubscribe = onSnapshot(studentsCollectionRef, (snapshot) => {
          const studentsList: StudentData[] = [];
          snapshot.forEach((doc) => {
            studentsList.push({ id: doc.id, ...doc.data() } as StudentData);
          });
          setStudents(studentsList.sort((a,b) => a.rollNumber.localeCompare(b.rollNumber, undefined, {numeric: true})));
          setLoading(false);
        });

        return () => unsubscribe();
      })
      .catch(() => notFound());
  }, [classCode]);

  const isFacultyOwner = useMemo(() => {
    if (!userProfile || !classData) return false;
    return userProfile.uid === classData.facultyId;
  }, [userProfile, classData]);

  const handleSaveAttendance = async () => {
    if (!classData) return;
    setIsSaving(true);
    const dateStr = format(attendanceDate, 'yyyy-MM-dd');
    const promises = Object.entries(checkedStudents)
      .filter(([, isChecked]) => isChecked)
      .map(([studentId]) => {
        const student = students.find(s => s.id === studentId);
        if (student && !student.attendanceHistory.includes(dateStr)) {
          const studentDocRef = doc(db, 'classes', classData.id, 'students', studentId);
          return updateDoc(studentDocRef, {
            attendanceHistory: arrayUnion(dateStr),
          });
        }
        return Promise.resolve();
      });

    try {
      await Promise.all(promises);
      toast({
        title: 'Attendance Saved',
        description: `Attendance for ${format(attendanceDate, 'PPP')} has been updated.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Saving Attendance', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!classData) return;
    setIsGeneratingSummary(true);
    setSummary('');

    const attendanceData = students.map(s => ({
        name: s.name,
        rollNumber: s.rollNumber,
        presentDates: s.attendanceHistory.filter(date => {
            const d = new Date(date);
            return d >= summaryDateRange.from && d <= summaryDateRange.to;
        })
    }));

    try {
      const result = await summarizeAttendance({
        classCode: classData.classCode,
        startDate: format(summaryDateRange.from, 'yyyy-MM-dd'),
        endDate: format(summaryDateRange.to, 'yyyy-MM-dd'),
        attendanceData: JSON.stringify(attendanceData),
      });
      setSummary(result.summary);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'AI Summary Failed', description: error.message });
    } finally {
        setIsGeneratingSummary(false);
    }
  };
  
  const handleAddStudent = async (values: z.infer<typeof studentFormSchema>) => {
    if (!classData) return;
    setIsSaving(true);
    try {
        const studentsCollectionRef = collection(db, 'classes', classData.id, 'students');
        // Check for duplicate roll number
        const studentQuery = query(studentsCollectionRef, where("rollNumber", "==", values.rollNumber));
        const querySnapshot = await getDocs(studentQuery);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'Student Exists', description: 'A student with this roll number is already in the class.'});
            return;
        }

        await addDoc(studentsCollectionRef, {
            name: values.name,
            rollNumber: values.rollNumber,
            attendanceHistory: [],
        });
        toast({ title: 'Student Added', description: `${values.name} has been enrolled.`});
        setIsAddStudentOpen(false);
        studentForm.reset();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Add Student', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }
  
  const exportToCSV = useCallback(() => {
    if (students.length === 0) return;

    const allDates = [...new Set(students.flatMap(s => s.attendanceHistory))].sort();
    let csvContent = "data:text/csv;charset=utf-8,Roll Number,Name," + allDates.join(',') + "\n";

    students.forEach(student => {
        const row = [student.rollNumber, student.name];
        allDates.forEach(date => {
            row.push(student.attendanceHistory.includes(date) ? "P" : "A");
        });
        csvContent += row.join(',') + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${classData?.classCode}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [students, classData]);


  if (loading || authLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!classData || !isFacultyOwner) {
    return (
      <div className="container py-12">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this class, or the class does not exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <BookCopy className="h-7 w-7" />
            {classData.className}
          </CardTitle>
          <CardDescription>
            Class Code: <span className="font-mono font-medium text-foreground bg-muted px-2 py-1 rounded-md">{classData.classCode}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance"><ListChecks className="mr-2 h-4 w-4"/>Mark Attendance</TabsTrigger>
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4"/>Students</TabsTrigger>
          <TabsTrigger value="history"><Bot className="mr-2 h-4 w-4"/>History & AI Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>Select the date and check the students who are present.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Note on Face Recognition</AlertTitle>
                <AlertDescription>
                  Live face recognition is a complex feature requiring dedicated machine learning infrastructure. For this demo, please mark attendance manually.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !attendanceDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {attendanceDate ? format(attendanceDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={attendanceDate}
                      onSelect={(date) => date && setAttendanceDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={!!checkedStudents[student.id]}
                            onCheckedChange={(checked) =>
                              setCheckedStudents((prev) => ({ ...prev, [student.id]: !!checked }))
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 {students.length === 0 && <p className="text-center text-muted-foreground p-8">No students enrolled yet.</p>}
              </div>
              <Button onClick={handleSaveAttendance} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Attendance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className='flex justify-between items-start'>
                <div>
                    <CardTitle>Enrolled Students ({students.length})</CardTitle>
                    <CardDescription>View and manage students in this class.</CardDescription>
                </div>
                <Button onClick={() => setIsAddStudentOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Add Student</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Total Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.attendanceHistory.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {students.length === 0 && <p className="text-center text-muted-foreground p-8">No students enrolled yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                  <div className='flex justify-between items-start'>
                      <div>
                          <CardTitle>Attendance History</CardTitle>
                          <CardDescription>Export all attendance data to a CSV file.</CardDescription>
                      </div>
                      <Button onClick={exportToCSV} variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                  </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                   <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Roll No.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.flatMap(s => s.attendanceHistory.map(date => ({...s, date}))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, index) => (
                           <TableRow key={`${record.id}-${record.date}-${index}`}>
                             <TableCell>{format(new Date(record.date), 'PPP')}</TableCell>
                             <TableCell>{record.name}</TableCell>
                             <TableCell>{record.rollNumber}</TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {students.flatMap(s => s.attendanceHistory).length === 0 && <p className="text-center text-muted-foreground p-8">No attendance has been recorded yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>AI Attendance Summary</CardTitle>
                <CardDescription>Generate an AI-powered summary of attendance trends.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground">Date Range (coming soon)</p>
                  </div>
                  <Button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      {isGeneratingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Summary
                  </Button>
                  {summary && (
                      <Card className="bg-muted">
                          <CardHeader>
                              <CardTitle className="text-base font-headline">Summary Results</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm whitespace-pre-wrap">
                            {summary}
                          </CardContent>
                      </Card>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Manually enroll a new student into this class.</DialogDescription>
            </DialogHeader>
            <Form {...studentForm}>
                <form onSubmit={studentForm.handleSubmit(handleAddStudent)} className="space-y-4">
                    <FormField control={studentForm.control} name="name" render={({field}) => (
                        <FormItem><FormLabel>Student Name</FormLabel><FormControl><Input placeholder="John Doe" {...field}/></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={studentForm.control} name="rollNumber" render={({field}) => (
                        <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="e.g., 102" {...field}/></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Student
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
