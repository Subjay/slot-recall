"use client";

export default function Call() {
  const fetchCall = async () => {
    await fetch("/api/call", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toNumber: "+4367764842662",
        first_name: "Vlad",
        last_name: "Doe",
        date: new Date("2026-02-13"),
        location: "123 Baker Street, London",
        doctor: "Bauer",
        doctor_phone: "+4367764842662",
      }),
    }).then((res) => console.log("fonio call", res));
  };

  return (
    <button
      onClick={async (_e) => {
        await fetchCall();
      }}
    >
      Test Call
    </button>
  );
}
