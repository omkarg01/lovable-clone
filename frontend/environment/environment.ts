const ENV = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ||
    (typeof window !== "undefined" ? "" : "http://localhost:3001"),
};

export default ENV;
