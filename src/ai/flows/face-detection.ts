'use server';

/**
 * @fileOverview An AI flow to detect faces in a photograph.
 *
 * - detectFacesInPhoto - A function that counts the number of faces in an image.
 * - FaceDetectionInput - The input type for the detectFacesInPhoto function.
 * - FaceDetectionOutput - The return type for the detectFacesIn-Photo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const FaceDetectionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a classroom, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type FaceDetectionInput = z.infer<typeof FaceDetectionInputSchema>;

export const FaceDetectionOutputSchema = z.object({
  faceCount: z.number().describe('The number of human faces detected in the photo.'),
});
export type FaceDetectionOutput = z.infer<typeof FaceDetectionOutputSchema>;

export async function detectFacesInPhoto(input: FaceDetectionInput): Promise<FaceDetectionOutput> {
  return faceDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'faceDetectionPrompt',
  input: { schema: FaceDetectionInputSchema },
  output: { schema: FaceDetectionOutputSchema },
  prompt: `You are an AI model that specializes in computer vision. Your task is to analyze the provided image and count the number of human faces present.

Only count clear, visible human faces. Do not count faces that are mostly obscured or out of focus. Return only the final count.

Image to analyze: {{media url=photoDataUri}}`,
});

const faceDetectionFlow = ai.defineFlow(
  {
    name: 'faceDetectionFlow',
    inputSchema: FaceDetectionInputSchema,
    outputSchema: FaceDetectionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
