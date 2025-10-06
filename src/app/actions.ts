"use server";

export async function search(formData: FormData) {
  const query = formData.get("query") as string;

  if (!query) {
    console.log("Search query is empty.");
    return;
  }

  console.log(`Searching for: ${query}`);

  // Simulate network delay to show loading state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real application, you would fetch data from an API or database
  // and return the results. You could then use react-dom's useFormState
  // to display the results on the page.
}
