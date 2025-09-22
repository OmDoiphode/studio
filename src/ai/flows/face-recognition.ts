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


const RecognizedStudentSchema = z.object({
    rollNumber: z.string().describe('The roll number of the student identified.'),
    box: z.object({
        x: z.number().describe('The x-coordinate of the top-left corner of the bounding box, as a fraction of the image width.'),
        y: z.number().describe('The y-coordinate of the top-left corner of the bounding box, as a fraction of the image height.'),
        width: z.number().describe('The width of the bounding box, as a fraction of the image width.'),
        height: z.number().describe('The height of the bounding box, as a fraction of the image height.'),
    }).describe('The bounding box of the detected face. The top-left corner of the box should be at (x, y).')
});

const FaceRecognitionOutputSchema = z.object({
  totalFacesDetected: z.number().describe('The total number of human faces detected in the classroom photo.'),
  presentStudents: z.array(RecognizedStudentSchema).describe('An array of students identified as present, with their roll number and face bounding box.'),
});
export type FaceRecognitionOutput = z.infer<typeof FaceRecognitionOutputSchema>;


export async function recognizeStudents(input: FaceRecognitionInput): Promise<FaceRecognitionOutput> {
  return faceRecognitionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceRecognitionPrompt',
  input: { schema: FaceRecognitionInputSchema },
  output: { schema: FaceRecognitionOutputSchema },
  prompt: `You are an AI expert in face recognition. Your task is to identify which students from a provided list are present in a classroom photograph and provide the bounding box for each recognized face.

You will be given:
1.  A main classroom photograph.
2.  A list of student profiles, each with a roll number and a reference profile photo.

Your process:
1.  Analyze the main classroom photograph to detect all visible human faces. The total count of detected faces should be stored in the 'totalFacesDetected' field.
2.  For each detected face, compare it against all the student profile photos provided.
3.  If a face in the classroom photo is a confident match for a student's profile photo, add that student to the 'presentStudents' list.
4.  For each matched student, you MUST provide the bounding box of their face in the classroom photo. The coordinates (x, y) and dimensions (width, height) must be fractional values between 0 and 1, relative to the image size. The top-left corner of the box should be at (x, y).
5.  A student should only be marked as present if their face is clearly visible and identifiable in the classroom photo.
6.  Return the total face count and an array of the students you have identified as present.

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
        return { totalFacesDetected: 0, presentStudents: [] };
    }

    const { output } = await prompt({
        ...input,
        studentProfiles: validStudentProfiles,
    });
    
    // Ensure output is not null, and presentStudents is an array.
    if (!output || !Array.isArray(output.presentStudents)) {
        return { totalFacesDetected: output?.totalFacesDetected || 0, presentStudents: [] };
    }

    return output;
  }
);
