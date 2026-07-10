import { BookOpen } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <BookOpen className="h-16 w-16 text-blue-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          AI Study Assistant
        </h1>
        <p className="text-center text-gray-500 max-w-md">
          AI 智能备考助手
        </p>
      </div>
    </main>
  );
}
