import { useEffect, useState } from "react";

function pickRandomMessage(messages: readonly string[]) {
  if (messages.length === 0) {
    return "";
  }

  return messages[Math.floor(Math.random() * messages.length)] ?? "";
}

export function useRandomMessage(messages: readonly string[]) {
  const [message, setMessage] = useState(() => pickRandomMessage(messages));

  useEffect(() => {
    setMessage(pickRandomMessage(messages));
  }, [messages]);

  return message;
}
