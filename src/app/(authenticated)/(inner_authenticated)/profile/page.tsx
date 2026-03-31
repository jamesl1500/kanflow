import styles from "@/styles/pages/profile/profile-main.module.scss"
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export default async function ProfileMainPage()
{   
    const supabase = await createClient();

    // Lets get the logged in user and their info
    const {data, error} = await supabase.auth.getSession();

    if(!data)
    {
        redirect("/login");
    }

    // Get profile
    const { data: profile } = await supabase.from("profiles").select()

    return (
        <div className={styles.profileMainPage}>
            <div className={styles.profileMainPageInner}>
                <div className={styles.profileMainPageJumbotron}>
                    <div className={styles.profileMainPageJumbotronCover}>

                    </div>
                    <div className={styles.profileMainPageJumbotronUsr}>

                    </div>
                </div>
            </div>
        </div>
    );
}