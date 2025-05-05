// File: constants/translations/en.ts
export const en = {
    // Common UI Elements (Consolidated)
    ok: "OK",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    submit: "Submit",
    retry: "Retry",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    information: "Information",

    // Navigation & Sections
    home: "Home",
    profile: "Profile",
    settings: "Settings",
    services: "Services",
    bookings: "Bookings",
    dashboard: "Dashboard",

    // Filters & Lists
    filter: "Filter",
    filter_jobs: "Filter Jobs",
    all_services: "All Services",
    select_service: "Select Service",
    errorloading: "Error Loading",
    trydifferentfilter: "Try a different filter",
    viewmore: "View More", // Ensure this key is intended if 'viewall' also exists

    // Urgent Jobs
    urgentjobpartners247: "24/7 Available Partners",
    nopartnersavailable: "No partners are currently available 24/7.",
    failedtoloadservices: "Could not load services:",
    failedloadurgentcompanies: "Failed to load available companies: {message}",
    unknowncompany: "Unknown Company",
    contact: "Contact:",

    // General & Authentication
    phonenumber: "Phone Number",
    nodata: "No data available",
    logout: "Log out",
    welcomemessage: "Welcome to the portal",
    update: "Update",
    forgotpassword: "Forgot Password?",
    status: "Status",
    search: "Search",
    signup: "Sign Up",
    areyousure: "Are you sure?",
    password: "Password",
    language: "Language",
    changepassword: "Change Password",
    email: "Email",
    login: "Login",
    reset: "Reset",
    username: "Username",
    rememberme: "Remember Me",
    date: "Date",
    time: "Time",

    // Booking Status & Filters
    no_description: "No description",
    not_available: "Not available",
    status_created: "Created",
    status_accepted: "Accepted",
    status_in_progress: "In Progress",
    status_completed: "Completed",
    all_statuses: "All Statuses",
    select_status: "Select Status",
    select_county: "Select County", // Removed duplicate
    select_municipality: "Select Municipality", // Removed duplicate
    loading_profile: "Loading Profile",
    error_loading_profile: "Error Loading Profile",
    no_supported_counties: "No Supported Counties",
    select_county_first: "Select County First", // Removed duplicate
    no_supported_municipalities: "No Supported Municipalities",
    error_profile: "Error Profile",

    // Login Screen
    createaccount: "Create Account",
    welcome: "Welcome",
    signinaspartner: "Sign In as Partner",
    signin: "Sign In",
    or: "Or",
    registeraspartner: "Register as Partner",

    // Validation Messages
    invalidemail: "Please enter a valid email address.",
    passwordtooshort: "Password must be at least 8 characters.",
    invalidemailtitle: "Invalid Email",
    passwordtooshorttitle: "Password Too Short",

    // Language Modal
    couldnotsavelanguage: "Could not save language preference.",
    languageselected: "Language Selected",
    english: "English",
    swedish: "Swedish",

    // Register Screen
    registeruser: "Register User",
    createyouraccount: "Create your account here",
    name: "Name",
    // selectcounty, selectmunicipality, selectcountyfirst moved to Booking Status section
    loadingmunicipalities: "Loading Municipalities...",
    errormunicipalities: "Error Loading",
    nomunicipalities: "No Municipalities Found",
    loadingcounties: "Loading Counties...",
    errorcounties: "Error Loading Counties",
    required: "Required",
    requiredminchars: "Required (min 8 chars)",
    missinginformation: "Please fill in all required fields correctly.",
    termsrequired: "Please agree to the Terms of Service & Privacy Policy.",
    signupsuccessful: "Sign Up Successful!",
    userregistered: "User registered successfully.",
    signupfailed: "Sign Up Failed",
    signuperror: "Sign Up Error",
    unexpectederror: "An unexpected error occurred:",
    couldnotloadcounties: "Could not load counties. Please try again later.",
    termsandprivacy: "I agree to the Terms of Service & Privacy Policy",
    termslinktext: "Terms of Service & Privacy Policy", // Specific key for the link part
    countyloadfailed: "Failed to load Counties: {message}",
    municipalityloadfailed: "Failed municipalities: {message}",
    signuperrorwithstatus: "An error occurred (Status: {status}).",

    // Home Screen & Categories
    chooseservicecategory: "Choose Service Category *",
    companydescription: "Company Description",
    companyname:"Company Name",
    selectlogo: "Select Logo",
    dontworry: "Don't worry, You can post your Requirement",
    didntfindyourservice: "Didn't find your Service?",
    newjobrequest: "New Job Request",
    urgentjob: "Urgent Job", // Might be obsolete if urgentjob247 is used
    urgentjob247: "Urgent Job 24/7",
    viewall: "View All", // Consider if different from 'viewmore'
    register: "Register",
    loginsrequired: "Login Required",
    logintoproceed: "Please login or register to continue.",
    newjobrequestmessage: "Would you like to create a new job request?",
    urgentjobmessage: "Would you like to view available urgent job partners?",
    actionnotallowed: "Action Not Allowed",
    onlyuserscancreate: "Only users can create job requests from services.",
    noservicesavailable: "No services available.",
    partnerscannotcreate: "Partners cannot create job requests.", // Added from home.tsx
    featurenotavailable: "Feature Not Available", // Added from home.tsx
    onlyavailableforusers: "This feature is only available for users.", // Added from home.tsx

    // Profile Screen
    loginsettings: "Settings",
    logincreateaccount: "Log in or create an account.",
    resetpassword: "Reset Password",
    logoutconfirm: "Confirm Logout",
    logoutmessage: "Are you sure?",
    about: "About",
    servicecategory: "Service Category",
    county: "County",
    municipality: "Municipality",
    regno: "Reg. No.",
    confirmavailability: "Confirm Availability",
    changeavailability: "Change availability to 24x7",
    statusupdated: "Status Updated",
    availabilityset: "Availability set to",
    regularhours: "Regular Hours",
    couldnotupdatestatus: "Could not update status",
    version: "v0.0.1",
    couldnotloadprofile: "Could not load profile.",

    // Create Job Card Screen
    createjobcard: "Create Job Card",
    chooseimages: "Choose Images",
    selectimagesource: "Select Image Source",
    camera: "Camera",
    library: "Library",
    permissionrequired: "Permission Required",
    cameraaccessneeded: "Camera access is required.",
    medialibraryaccessneeded: "Media library access is required.",
    cameraerror: "Camera Error",
    libraryerror: "Library Error",
    limitreached: "Limit Reached",
    max3images: "You can select up to 3 images.",
    selectservice: "Select Service", // Duplicate removed from filter section
    description: "Description",
    notloggedin: "Not Logged In",
    logintocreate: "Please log in to create a job request.",
    loginbutton: "Log In",
    couldnotretrieveusername: "Could not retrieve username. Please try again.",
    pleaseselectimage: "Please select at least one image.",
    pleaseselectservice: "Please select at least one service category.",
    pleaseenterdescription: "Please enter a description.",
    pleaseselectcounty: "Please select a county.",
    pleaseselectmunicipality: "Please select a municipality.",
    jobcardcreated: "Job card created successfully!",
    ticketid: "Ticket ID:",
    errorcreatingjobcard: "Error creating job card",
    unexpectednetworkerror: "An unexpected network error occurred:",
    enterjobtitle: "Enter Job Title",
    enterjobdescription: "Enter Job Description",
    enterlocationdetails: "Enter Location Details",
    entercontactnumber: "Enter Contact Number",
    enteremailaddress: "Enter Email Address",
    enterpreferreddate: "Enter Preferred Date",
    enterpreferredtime: "Enter Preferred Time",
    enterbudget: "Enter Budget (Optional)",
    enteradditionalnotes: "Enter Additional Notes (Optional)",

    // Booking Details Screen
    bookingdetails: "Booking Details",
    invalidticketid: "Invalid Ticket ID.",
    sessionexpired: "Session Expired",
    pleaseloginagain: "Please log in again.",
    failedfetchdetails: "Failed to fetch details (Status: {status}). {errorText}",
    failedloadbookingdetails: "Failed to load booking details: {message}",
    goback: "Go Back",
    bookingnotfound: "Booking details not found or empty for Ticket ID {ticketId}.",
    unknownstatus: "Unknown",
    acceptjob: "Accept Job",
    startjob: "Start Job",
    completejob: "Complete Job",
    otpdisplay: "OTP: {otp}",
    confirmaction: "Confirm Action",
    acceptjobquestion: "Accept job?",
    startjobquestion: "Start job?",
    cannotupdatestatus: "Cannot update status.",
    statusupdatedsuccess: "Status updated successfully",
    errorupdatingstatus: "Error updating status",
    missingticketid: "Missing Ticket ID.",
    cannotmakecall: "Cannot Make Call",
    devicenotsupportcall: "Device does not support calling {phoneNumber}.",
    cannotcall: "Cannot Call",
    providerphonenotavailable: "Provider phone number not available.",
    otpcopied: "OTP Copied",
    couldnotcopyotp: "Could not copy OTP.",
    nootp: "No OTP",
    otpnotavailable: "OTP not available.",
    noimages: "No Images",
    cannotchat: "Cannot Chat",
    requiredinfomissing: "Required information missing.",
    cannotidentifyparticipant: "Could not identify the other participant.",
    jobdescription: "Job Description",
    location: "Location",
    notapplicable: "N/A",
    interestedpartners: "Interested Partners",
    errorloadingpartners: "Error loading partners: {error}",
    nopartnersmessage: "No partners have messaged about this job yet.",
    contactuserquote: "CONTACT USER (Send Quote)",
    chat: "CHAT",
    aboutprovider: "About Your Provider",
    aboutcustomer: "About Customer",
    serviceproof: "Service Proof",
    partnercomment: "Partner Comment:",
    proofimages: "Proof Images:",
    viewupdateserviceproof: "View/Update Service Proof",
    uploadserviceproof: "Upload Service Proof",
    yourreview: "Your Review",
    ratingdisplay: "Rating: {stars}",
    commentdisplay: "Comment: {comment}", // Kept for potential direct use
    providerresponse: "Provider Response:",
    notratedyet: "You haven't rated this service yet.",
    enterotpfromuser: "Enter OTP From User",
    askcustomerotp: "Ask the customer for the 4-digit code.",
    invalidotp: "Please enter a valid 4-digit OTP.",
    submitcomplete: "Submit & Complete",

    // Update Booking Status Screen
    updateserviceproof: "Update Service Proof",
    cannotupdate: "Cannot Update",
    updateonlyinprogress: "Service proof can only be uploaded or updated when the job status is 'In Progress'.",
    updatesonlyinprogressinfo: "Updates only allowed when job is In Progress.",
    currentproofimages: "Current Proof Images:",
    addimagesinfo: "Selecting new images below will be added (API might replace/add depending on backend logic).",
    addimagesbutton: "Add Images ({count}/{max}) *",
    maximagesalert: "Max {max} images.",
    descriptionworkdone: "Description of work done *",
    enterjobdetailsplaceholder: "Enter details about the job completed...",
    cannotsubmit: "Cannot Submit",
    invalidsessionorticketid: "Invalid session or Ticket ID.",
    enterdescriptionalert: "Please enter a description of the work done.",
    uploadoneimagealert: "Please upload at least one service proof image.",
    submitreport: "Submit Report",
    reportsubmittedsuccess: "Report submitted successfully.",
    errorsubmittingreport: "Error Submitting Report",
    unexpectednetworkerrorwithmessage: "An unexpected network error occurred: {message}",

    // Login Screen Placeholders
    passwordPlaceholder: "Password",

    // _layout.tsx Alerts
    permissionrequired_title: "Permission required",
    permissionrequired_message: "Enable notifications to receive job updates.",
    physicaldevice_title: "Physical device required",
    physicaldevice_message: "Notifications only work on physical devices.",
    jobalert_title: "Job Alert",
    jobalert_message: "You have a new update.",

    // Partner Registration Screen
    alreadyhaveaccount: "Already have a partner account?", // Might be same as alreadyhavepartneraccount
    itemsSelected: "{count} items selected",
    emailAlreadyRegistered: "Email: Already registered. Try signing in.",
    companylogo: "Company Logo",
    available24x7label: "Available 24x7?",
    registrationnumberplaceholder: "Registration Number",
    passwordmin8chars: "Password (min 8 chars)",
    alreadyhavepartneraccount: "Already have a partner account?",

    // Chat Screen
    enterchatmessage_placeholder: "Enter Message",
    couldnotsendmessage: "Could not send message: {message}", // Added translation

    // Find Partners Screen
    chatwithcompanies_title: "Chat with companies",
    failedloadpartners: "Failed to load partners: {message}",
    nopartnersfound: "No matching partners found for this job's criteria.",

    // ForgotPasswordModal
    fpm_enteremail_subtitle: "Enter your email address",
    fpm_email_placeholder: "Email Address",
    fpm_partneraccount_label: "Partner account",
    fpm_step1_infotext: "Password reset instructions will be sent to your email address if the account exists.",
    fpm_otp_placeholder: "Enter Otp",
    fpm_newpassword_placeholder: "New Password (min 8 chars)",
    fpm_step2_infotext: "Enter the OTP sent to your email and set a new password.",
    fpm_emailrequired_title: "Email Required",
    fpm_emailrequired_message: "Please enter your email address.",
    fpm_invalidemailformat_title: "Invalid Email Format",
    fpm_noaccountfound_message: "No account found for this email address.",
    fpm_otpsent_message: "OTP successfully sent to the registered email.",
    fpm_sendresetfailed_message: "Failed to send password reset request (Status: {status})",
    fpm_genericerror_message: "An error occurred. Please check your connection and try again.",
    fpm_missingotpnewpassword_message: "Please enter the OTP and your new password.",
    fpm_newpasswordtooshort_message: "New password must be at least 8 characters.",
    fpm_resetsuccess_message: "Your password has been reset successfully.",
    fpm_resetfailed_message: "Password reset failed (Status: {status})",
    fpm_resetexception_message: "Could not reset password. Please try again. {message}",
    confirmSelection: "Confirm Selection",
    applyfilter: "Apply Filter", // Added translation

    // Alerts
    alertTitle: "Alert",

    // Register Type Modal
    rtm_title: "Register",
    rtm_subtitle: "Register as a",
    rtm_partner_button: "PARTNER",
    rtm_user_button: "USER",

    // Errors
    error_title: "Error", // Generic error title

    // Review Feature Keys
    review_section_title: "Rate this Service",
    review_rating_label: "Your Rating:",
    review_comment_label: "Your Comment (Optional):",
    review_comment_placeholder: "Tell us about your experience...",
    review_submit_button: "Submit Review",
    review_select_rating_alert: "Please select a star rating.",
    // review_enter_comment_alert: "Please enter a comment.", // Uncomment if comment becomes mandatory
    review_submit_success_default: "Review submitted successfully!",
    review_submit_error: "Could not submit review",
    missinginfo: "Missing Information", // Can reuse this if appropriate
    commentdisplay_prefix: "Comment:", // Prefix for displaying submitted comment
    partner_view_review_title: "Customer Review",
    partner_view_comment_prefix: "Comment:", // Can be same as user view or different if needed
    partner_view_no_comment: "Customer did not leave a comment.", // Message when comment is empty/null
};