import type { Metadata } from "next";
import { ShieldCheck, CalendarClock, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";
import { DemoPicker } from "./demo-picker";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { icon: CalendarClock, text: "Never miss a renewal: contracts sorted by their decision deadline." },
  { icon: Timer, text: "Response times measured against each contract's SLA." },
  { icon: ShieldCheck, text: "Preventive maintenance planned, assigned and tracked." },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo inverted />
        <div className="space-y-6">
          <h1 className="max-w-md text-3xl font-semibold tracking-tight">
            Service contracts and maintenance, out of the spreadsheet.
          </h1>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex max-w-md gap-3 text-primary-foreground/80">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Velden Klimatechnik GmbH · demo company with synthetic data
        </p>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Explore the demo</CardTitle>
              <CardDescription>
                Sign in as one of the team roles. Each role sees a different menu and different data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemoPicker />
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or sign in with your account
            <Separator className="flex-1" />
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
