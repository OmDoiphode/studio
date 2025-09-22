'use server';

/**
 * @fileOverview An AI flow to recognize students in a class photo.
 *
 * - recognizeStudents - Matches faces in a class photo to student profile photos.
 * - FaceRecognitionInput - The input type for the recognizeStudents function.
 * - FaceRecognitionOutput - The return type for the recognizeStudents function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudentProfileSchema = z.object({
    rollNumber: z.string().describe('The unique roll number of the student.'),
    profilePhotoUrl: z.string().describe("A data URI of the student's profile photo. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

const FaceRecognitionInputSchema = z.object({
  classPhotoDataUri: z
    .string()
    .describe(
      "A photo of a classroom, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  studentProfiles: z.array(StudentProfileSchema).describe('An array of student profiles to identify.')
});
export type FaceRecognitionInput = z.infer<typeof FaceRecognitionInputSchema>;

const FaceRecognitionOutputSchema = z.object({
  presentRollNumbers: z.array(z.string()).describe('An array of roll numbers for students identified as present in the class photo.'),
});
export type FaceRecognitionOutput = z.infer<typeof FaceRecognitionOutputSchema>;


export async function recognizeStudents(input: FaceRecognitionInput): Promise<FaceRecognitionOutput> {
  return faceRecognitionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceRecognitionPrompt',
  input: { schema: FaceRecognitionInputSchema },
  output: { schema: FaceRecognitionOutputSchema },
  prompt: `You are an AI expert in face recognition. Your task is to identify which students from a provided list are present in a classroom photograph.

You will be given:
1.  A main classroom photograph.
2.  A list of student profiles, each with a roll number and a reference profile photo.

Your process:
1.  Analyze the main classroom photograph to detect all visible human faces.
2.  For each detected face, compare it against all the student profile photos provided.
3.  If a face in the classroom photo is a confident match for a student's profile photo, add that student's roll number to the 'presentRollNumbers' list.
4.  A student should only be marked as present if their face is clearly visible and identifiable in the classroom photo.
5.  Return an array of the roll numbers of all students you have identified as present.

Classroom Photo:
{{media url=classPhotoDataUri}}

Student Roster:
{{#each studentProfiles}}
- Student Roll Number: {{{rollNumber}}}
  Profile Photo: {{media url=profilePhotoUrl}}
{{/each}}
`,
});


const faceRecognitionFlow = ai.defineFlow(
  {
    name: 'faceRecognitionFlow',
    inputSchema: FaceRecognitionInputSchema,
    outputSchema: FaceRecognitionOutputSchema,
  },
  async (input) => {
    // Filter out students who don't have a profile photo, as they cannot be recognized.
    const validStudentProfiles = input.studentProfiles.filter(p => p.profilePhotoUrl && p.profilePhotoUrl.startsWith('data:image'));

    if (validStudentProfiles.length === 0) {
        return { presentRollNumbers: [] };
    }

    const { output } = await prompt({
        ...input,
        studentProfiles: validStudentProfiles,
    });
    
    // Ensure output is not null, and presentRollNumbers is an array.
    if (!output || !Array.isArray(output.presentRollNumbers)) {
        return { presentRollNumbers: [] };
    }

    return output;
  }
);

    