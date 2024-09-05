'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
	prevState: string | undefined,
	formData: FormData,
  ) {
	try {
	  await signIn('credentials', formData);
	} catch (error) {
	  if (error instanceof AuthError) {
		switch (error.type) {
		  case 'CredentialsSignin':
			return 'Invalid credentials.';
		  default:
			return 'Something went wrong.';
		}
	  }
	  throw error;
	}
  }
  
const FormSchema = z.object({
	id: z.string(),
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(['pending', 'paid']),
	date: z.string(),
  });

  const CreateInvoice = FormSchema.omit({ id: true, date: true });

  export type State = {
	errors?: {
	  customerId?: string[];
	  amount?: string[];
	  status?: string[];
	};
	message?: string | null;
  };

  export async function createInvoice(prevState: State, formData: FormData) {

	const { customerId, amount, status } = CreateInvoice.parse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	  });

	  const FormSchema = z.object({
		id: z.string(),
		customerId: z.string({
		  invalid_type_error: 'Please select a customer.',
		}),
		amount: z.coerce
		  .number()
		  .gt(0, { message: 'Please enter an amount greater than $0.' }),
		status: z.enum(['pending', 'paid'], {
		  invalid_type_error: 'Please select an invoice status.',
		}),
		date: z.string(),
	  });

	// Test it out:
	console.log(FormSchema);

	const amountInCents = amount * 100;
	const date = new Date().toISOString().split('T')[0];

	await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

   revalidatePath('/dashboard/invoices');
   redirect('/dashboard/invoices');

}