const encode = (data: { [key: string]: string }) => {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

const handleSubmit = (event: Event) => {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries()) as { [key: string]: string };

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encode({ "form-name": "feedback", ...data })
  })
    .then(() => {
      alert("Feedback submitted successfully!");
      (document.getElementById('feedback-dialog') as HTMLDialogElement).close();
    })
    .catch(error => {
      alert("Error submitting feedback: " + error);
    });
};

export { handleSubmit };
