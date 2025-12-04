"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateReferralCode,
  useReferralCode,
  getUserReferralCode,
} from "@/lib/actions/achievement.action";
import { toast } from "sonner";
import { Copy, Check, Gift } from "lucide-react";

const ReferralComponent = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);

  // Load existing referral code on mount
  useEffect(() => {
    const loadCode = async () => {
      try {
        const code = await getUserReferralCode();
        if (code) {
          setReferralCode(code.code);
        }
      } catch (error) {
        console.error("Error loading referral code:", error);
      } finally {
        setLoadingCode(false);
      }
    };
    loadCode();
  }, []);

  const handleGenerateCode = async () => {
    try {
      const result = await generateReferralCode();
      setReferralCode(result.code);
      if (result.alreadyExists) {
        toast.info("You already have a referral code!");
      } else {
        toast.success("Referral code generated successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate referral code");
    }
  };

  const handleUseCode = async () => {
    if (!inputCode.trim()) {
      toast.error("Please enter a referral code");
      return;
    }

    setIsSubmitting(true);
    try {
      await useReferralCode(inputCode.trim());
      toast.success("Referral code applied! The code creator received 45 XP.");
      setInputCode("");
    } catch (error: any) {
      toast.error(error.message || "Failed to use referral code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="rounded-4xl border border-black">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <CardTitle className="text-2xl font-bold">Refer a Friend</CardTitle>
        </div>
        <CardDescription>
          Share your code and earn 45 XP when someone uses it!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate/Display Referral Code Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {referralCode ? (
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  readOnly
                  className="input font-mono text-lg"
                />
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="border-black"
                  size="icon"
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateCode}
                className="btn-primary w-full"
                disabled={loadingCode}
              >
                {loadingCode ? "Loading..." : "Generate My Referral Code"}
              </Button>
            )}
            {referralCode && (
              <p className="text-sm text-muted-foreground">
                Share this code with friends. When they use it, you&apos;ll get 45 XP!
              </p>
            )}
          </div>
        </div>

        {/* Use Referral Code Section */}
        <div className="space-y-4 border-t border-black pt-6">
          <h3 className="font-semibold text-lg">Use a Referral Code</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter referral code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUseCode();
                }
              }}
            />
            <Button
              onClick={handleUseCode}
              className="btn-primary"
              disabled={isSubmitting || !inputCode.trim()}
            >
              {isSubmitting ? "Applying..." : "Apply"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a friend&apos;s referral code to help them earn XP. You can only use one code.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralComponent;

