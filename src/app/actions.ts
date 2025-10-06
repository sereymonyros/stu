"use server";

import { redirect } from 'next/navigation';

export async function search(formData: FormData) {
  const query = formData.get("query") as string;

  if (!query) {
    console.log("Search query is empty.");
    return;
  }

  redirect(`/search?q=${encodeURIComponent(query)}`);
}
