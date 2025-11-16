import { PropsWithChildren, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/adminSession";
import { useNavigate } from "react-router-dom";

type AdminGuardProps = PropsWithChildren<{
	title?: string;
}>;

const AdminGuard = ({ children }: AdminGuardProps) => {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [hasAccess, setHasAccess] = useState(false);
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		const existing = getAdminToken();
		if (existing) {
			setPassword(existing);
			setHasAccess(true);
		}
	}, []);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setTouched(true);
		if (!password.trim()) return;
		setAdminToken(password.trim());
		setHasAccess(true);
	}

	if (hasAccess) {
		return (
			<>
				<button
					type="button"
					onClick={() => { clearAdminToken(); navigate("/admin"); }}
					className="fixed right-3 top-3 text-xs text-muted-foreground hover:underline"
				>
					Se déconnecter
				</button>
				{children}
			</>
		);
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
			<div className="w-full max-w-md">
				<Card className="shadow-lg rounded-2xl">
					<CardHeader>
						<CardTitle className="text-center text-2xl font-display">
							Accès espace rédaction
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<label htmlFor="admin-pass" className="text-sm font-medium text-foreground">
									Mot de passe administrateur
								</label>
								<Input
									id="admin-pass"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									autoComplete="off"
								/>
								{touched && !password.trim() && (
									<p className="text-xs text-destructive">Veuillez saisir le mot de passe.</p>
								)}
							</div>
							<Button type="submit" className="w-full">Entrer dans l’espace rédaction</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default AdminGuard;



