'use server';
/**
 * @fileOverview A flow to convert plain text into a PDF file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ConvertToPdfInputSchema = z.object({
  text: z.string().describe('The text content to convert to PDF.'),
  fileName: z.string().describe('The base name for the output file.'),
});
export type ConvertToPdfInput = z.infer<typeof ConvertToPdfInputSchema>;

const ConvertToPdfOutputSchema = z.object({
  pdfDataUri: z.string().describe("The generated PDF as a data URI."),
  fileName: z.string().describe("The name of the generated PDF file."),
});
export type ConvertToPdfOutput = z.infer<typeof ConvertToPdfOutputSchema>;

export async function convertToPdf(input: ConvertToPdfInput): Promise<ConvertToPdfOutput> {
  return convertToPdfFlow(input);
}

const convertToPdfFlow = ai.defineFlow(
  {
    name: 'convertToPdfFlow',
    inputSchema: ConvertToPdfInputSchema,
    outputSchema: ConvertToPdfOutputSchema,
  },
  async ({ text, fileName }) => {
    try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const page = pdfDoc.addPage();
        
        const { width, height } = page.getSize();
        const fontSize = 12;
        const margin = 50;
        
        page.drawText(text, {
            x: margin,
            y: height - margin,
            font,
            size: fontSize,
            color: rgb(0, 0, 0),
            maxWidth: width - 2 * margin,
            lineHeight: fontSize * 1.2,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
        
        const pdfFileName = fileName.replace(/\.[^/.]+$/, "") + ".pdf";

        return { pdfDataUri, fileName: pdfFileName };

    } catch (e: any) {
        console.error(`Flow Error: Failed to convert text to PDF for "${fileName}".`, e);
        throw new Error(`Failed to convert text to PDF: ${e.message}`);
    }
  }
);
