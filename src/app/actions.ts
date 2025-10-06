"use server";

import { redirect } from 'next/navigation';

export async function search(formData: FormData) {
  const queryText = formData.get("query") as string;

  if (!queryText) {
    return redirect('/search');
  }

  redirect(`/search?q=${encodeURIComponent(queryText)}`);
}
