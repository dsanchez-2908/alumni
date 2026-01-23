import { toast } from 'sonner';

export const useToast = () => {
  const showSuccess = (message: string, description?: string) => {
    toast.success(message, { description });
  };

  const showError = (message: string, description?: string) => {
    toast.error(message, { description });
  };

  const showInfo = (message: string, description?: string) => {
    toast.info(message, { description });
  };

  const showWarning = (message: string, description?: string) => {
    toast.warning(message, { description });
  };

  const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  };

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    promise: showPromise,
  };
};
