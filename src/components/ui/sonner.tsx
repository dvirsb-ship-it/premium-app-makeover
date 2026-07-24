import { Toaster as Sonner } from "sonner";
import { useSettings } from "../../lib/settings";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { lang, theme } = useSettings();
  const dir = lang === "he" ? "rtl" : "ltr";
  const position = lang === "he" ? "top-left" : "top-right";

  return (
    <Sonner
      dir={dir}
      position={position}
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast liquid-glass glass-hero !rounded-2xl !border-0 !text-foreground !bg-transparent backdrop-blur-xl",
          title: "!font-bold !text-foreground",
          description: "!text-foreground/75",
          actionButton: "!bg-gold !text-navy",
          cancelButton: "!bg-muted !text-muted-foreground",
          success: "!text-foreground",
          error: "!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
