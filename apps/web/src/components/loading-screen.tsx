import { AppLoader } from "@/components/app-loader";

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({
  label = "Preparando la experiencia ATLHYT..."
}: LoadingScreenProps) {
  return <AppLoader fullScreen label={label} />;
}
