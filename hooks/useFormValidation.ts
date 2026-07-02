// FILE: /frontend/hooks/useFormValidation.ts
// NEW HOOK: Better form validation with debounce

import { useState, useCallback, useRef } from "react";

export interface FormField {
  value: string | number;
  error?: string;
  isDirty: boolean;
}

export interface FormErrors {
  [key: string]: string;
}

interface ValidationRules {
  [key: string]: (value: any) => string | null;
}

export function useFormValidation(
  initialValues: Record<string, any>,
  validationRules: ValidationRules,
  onValidate?: (errors: FormErrors) => void
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  const validateField = useCallback(
    (fieldName: string, value: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const rule = validationRules[fieldName];
        if (!rule) return;

        const error = rule(value);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next[fieldName] = error;
          } else {
            delete next[fieldName];
          }
          onValidate?.(next);
          return next;
        });
      }, 300); // 300ms debounce
    },
    [validationRules, onValidate]
  );

  const handleChange = useCallback(
    (fieldName: string, value: any) => {
      setValues((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
      validateField(fieldName, value);
    },
    [validateField]
  );

  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    // Validate immediately on blur
    const rule = validationRules[fieldName];
    if (rule) {
      const error = rule(values[fieldName]);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    }
  }, [values, validationRules]);

  const validateAll = useCallback(() => {
    const newErrors: FormErrors = {};
    
    Object.entries(validationRules).forEach(([fieldName, rule]) => {
      const error = rule(values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setErrors(newErrors);
    onValidate?.(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules, onValidate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues,
  };
}

/* USAGE EXAMPLE in Add Expense form:

import { useFormValidation } from "../../hooks/useFormValidation";

export default function AddExpenseForm() {
  const { values, errors, touched, handleChange, handleBlur, validateAll } = 
    useFormValidation(
      { amount: "", description: "" },
      {
        amount: (v) => {
          if (!v) return "Amount required";
          if (isNaN(v)) return "Must be a number";
          if (v <= 0) return "Must be > 0";
          return null;
        },
        description: (v) => {
          if (!v) return "Description required";
          if (v.length < 3) return "Min 3 characters";
          return null;
        },
      }
    );

  return (
    <View>
      <TextInput
        value={values.amount}
        onChangeText={(v) => handleChange("amount", v)}
        onBlur={() => handleBlur("amount")}
        placeholder="Amount"
      />
      {touched.amount && errors.amount && (
        <Text style={{ color: "#F44336" }}>{errors.amount}</Text>
      )}
    </View>
  );
}

BENEFITS:
- Real-time validation with debounce (300ms)
- Only shows errors after field touched or blur
- Clear error messages
- Better UX than showing all errors at once
*/
