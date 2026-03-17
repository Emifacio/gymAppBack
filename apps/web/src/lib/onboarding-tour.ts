import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const createOnboardingTour = (onComplete: () => void) => {
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        element: "#tour-credits",
        popover: {
          title: "Tus Créditos",
          description: "Aquí puedes ver cuántos créditos tienes disponibles en tu plan actual para reservar clases.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: 'a[href="/workouts"]',
        popover: {
          title: "Explorar Clases",
          description: "Haz clic aquí para ver el horario completo y elegir tu próximo entrenamiento.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-workouts",
        popover: {
          title: "Reservar Clase",
          description: "Elige la clase que prefieras y resérvala con un solo clic para asegurar tu lugar.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: 'a[href="/bookings"]',
        popover: {
          title: "Tus Reservas",
          description: "En esta sección podrás ver todas tus clases próximas y gestionarlas.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-cancel-booking",
        popover: {
          title: "Cancelar Reserva",
          description: "Si no puedes asistir, recuerda cancelar con tiempo aquí para liberar el lugar.",
          side: "top",
          align: "start",
        },
      },
    ],
    onDestroyed: () => {
      // Driver.js doesn't have a direct "onFinish" that is separate from "onCancel" easily in the config object
      // but we can check the current step or just mark as completed when the user finishes.
      // For simplicity, we celebrate completion.
      onComplete();
    },
  });

  return driverObj;
};
