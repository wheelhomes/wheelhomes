'use server';

export async function checkEmailExistsAction(_email: string) {
    // Disabled to prevent unauthenticated user enumeration.
    return { success: false, error: "Endpoint disabled" };
}
