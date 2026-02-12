import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="mt-4 text-gray-500">ページが見つかりませんでした</p>
      <Link
        to="/"
        className="mt-6 text-sm font-medium text-accent hover:underline"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
