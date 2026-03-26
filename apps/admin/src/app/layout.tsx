import "@ant-design/v5-patch-for-react-19";
import { Outlet } from "react-router-dom";
import "./globals.css";
import Providers from "./providers";

export default function RootLayout() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}
