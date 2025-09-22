// src/ai/flows/attendance-summarization.ts
'use server';

/**
 * @fileOverview Summarizes attendance for a class over a date range.
 *
 * - summarizeAttendance - A function that generates the attendance summary.
 * - AttendanceSummaryInput - The input type for the summarizeAttendance function.
 * - AttendanceSummaryOutput - The return type for the summarizeAttendance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AttendanceSummaryInputSchema = z.object({
  classCode: z.string().describe('The unique code for the class.'),
  startDate: z.string().describe('The start date for the attendance summary (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date for the attendance summary (YYYY-MM-DD).'),
  attendanceData: z.string().describe('The attendance data for the specified class and date range, formatted as a JSON string.'),
});
export type AttendanceSummaryInput = z.infer<typeof AttendanceSummaryInputSchema>;

const AttendanceSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of student attendance for the specified class and date range, highlighting students with poor attendance.'),
});
export type AttendanceSummaryOutput = z.infer<typeof AttendanceSummaryOutputSchema>;

export async function summarizeAttendance(input: AttendanceSummaryInput): Promise<AttendanceSummaryOutput> {
  return attendanceSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'attendanceSummaryPrompt',
  input: {schema: AttendanceSummaryInputSchema},
  output: {schema: AttendanceSummaryOutputSchema},
  prompt: `You are an AI assistant that generates a summary of student attendance for a specific class and date range.

  Your goal is to quickly identify students with poor attendance so the faculty can provide intervention.

  Here is the class code: {{{classCode}}}
  Here is the start date: {{{startDate}}}
  Here is the end date: {{{endDate}}}
  Here is the attendance data (JSON format): {{{attendanceData}}}

  Please provide a concise summary that highlights students with poor attendance records. Focus on providing actionable insights for the faculty.
  `,
});

const attendanceSummaryFlow = ai.defineFlow(
  {
    name: 'attendanceSummaryFlow',
    inputSchema: AttendanceSummaryInputSchema,
    outputSchema: AttendanceSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
