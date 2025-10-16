'use client'
import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";

const SignInPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur'
    }, );
    const onSubmit = async (data: SignInFormData) => {
        try {
            console.log(data)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            <h1 className="form-title">
                Login to your Account
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField 
                    name="email"
                    label="Email"
                    placeholder="Enter your Email"
                    register={register}
                    error={errors.email}
                    validation={{required: 'Email is required!', pattern: /^\w+@\w+\.\w+$/, message: 'Email address is required'}}
                />
                <InputField 
                    name="password"
                    label="password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{required: 'Password is required!', minLength: 8}}
                />
                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Signing In': 'Sign In'}
                </Button>

                <FooterLink text="Don't have a account?" linkText="Create an account" href="/sign-up"></FooterLink>
            </form>
        </>
    )
}
export default SignInPage