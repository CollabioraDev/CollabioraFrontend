import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button2";
import { Trash } from "@mynaui/icons-react";

export default function AlertDialog2() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Show Icon Dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="mb-4 items-center gap-2 md:flex-row md:items-start md:gap-4">
          <div
            aria-hidden="true"
            className="shrink-0 rounded-full bg-red-50 p-3 dark:bg-red-900"
          >
            <Trash className="size-6 text-red-600 dark:text-red-200" />
          </div>
          <div className="flex flex-col gap-2">
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting your account is irreversible and will erase all your
              data. This action cannot be undone.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
