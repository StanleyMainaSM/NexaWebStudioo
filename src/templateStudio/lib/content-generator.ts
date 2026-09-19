export const industryContentMap: Record<string, any> = {
  'SaaS': {
    hero: { headline: "Build Faster, Scale Better", subheadline: "The all-in-one platform for modern teams to collaborate, build, and ship products at the speed of thought.", primaryCTA: { label: "Start Free Trial", url: "#" }, secondaryCTA: { label: "Watch Demo", url: "#" } },
    features: { headline: "Everything you need to succeed", subheadline: "Powerful tools designed for modern workflows", items: [{ title: "Real-time Collaboration", description: "Work together with your team in real-time, anywhere in the world." }, { title: "Advanced Analytics", description: "Deep insights into your performance with our powerful data tools." }, { title: "Enterprise Security", description: "Bank-grade security ensures your data is always safe." }] },
    pricing: { headline: "Simple, transparent pricing", items: [{ title: "Starter", price: "$0", description: "Perfect for individuals.", features: ["Up to 3 projects", "Basic analytics", "24hr support"] }, { title: "Pro", price: "$49", description: "For professional teams.", features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom domains"] }, { title: "Enterprise", price: "Custom", description: "For large organizations.", features: ["Dedicated success manager", "Custom contracts", "SLA guarantee", "SSO"] }] },
    testimonials: { headline: "Trusted by innovative teams", items: [{ quote: "This platform completely transformed how our engineering team delivers software.", author: "Elena Rodriguez", role: "CTO, TechCorp" }, { quote: "The best tool we've added to our stack this year. Highly recommended.", author: "Marcus Johnson", role: "Product Manager" }] }
  },
  'Restaurant': {
    hero: { headline: "Experience Culinary Excellence", subheadline: "A symphony of flavors crafted from locally sourced ingredients. Reserve your table for an unforgettable dining experience.", primaryCTA: { label: "Book a Table", url: "#" }, secondaryCTA: { label: "View Menu", url: "#" } },
    features: { headline: "Our Philosophy", subheadline: "What makes us unique", items: [{ title: "Farm to Table", description: "Fresh ingredients sourced directly from local farmers." }, { title: "Award Winning Chef", description: "Our executive chef brings 20 years of Michelin-star experience." }, { title: "Curated Wine List", description: "Over 500 selections perfectly paired with our menu." }] },
    gallery: { headline: "Signature Dishes", items: [ { title: "Appetizers" }, { title: "Main Courses" }, { title: "Desserts" } ] },
    testimonials: { headline: "What Our Guests Say", items: [{ quote: "The best dining experience I've had in years. The tasting menu is a journey.", author: "Sarah Jenkins", role: "Food Critic" }, { quote: "Impeccable service and an atmosphere that perfectly balances luxury and comfort.", author: "David Chen", role: "Local Guide" }] }
  },
  'Hotel': {
    hero: { headline: "Escape to Unrivaled Elegance", subheadline: "Experience the pinnacle of luxury at our award-winning boutique resort.", primaryCTA: { label: "Book Your Stay", url: "#" }, secondaryCTA: { label: "Explore Rooms", url: "#" } },
    features: { headline: "Curated Experiences", subheadline: "Every detail designed for your comfort", items: [{ title: "Spa & Wellness", description: "Rejuvenate in our world-class holistic spa facility." }, { title: "Fine Dining", description: "Michelin-starred cuisine featuring local seasonal ingredients." }, { title: "Private Concierge", description: "24/7 dedicated service to fulfill your every request." }] },
    gallery: { headline: "The Estate", items: [ { title: "Ocean View Suite" }, { title: "Lounge" }, { title: "Wellness Spa" } ] }
  },
  'Real Estate': {
    hero: { headline: "Find Your Dream Home", subheadline: "Discover exclusive properties in the most sought-after neighborhoods with our premium real estate service.", primaryCTA: { label: "Browse Properties", url: "#" }, secondaryCTA: { label: "Meet Our Agents", url: "#" } },
    features: { headline: "Why Choose Us", items: [{ title: "Exclusive Listings", description: "Access to properties you won't find anywhere else." }, { title: "Expert Agents", description: "Decades of experience in the luxury real estate market." }, { title: "Seamless Process", description: "From viewing to closing, we handle everything for you." }] },
    gallery: { headline: "Featured Listings", items: [ { title: "Beverly Hills Estate" }, { title: "Downtown Penthouse" }, { title: "Modern Villa" } ] }
  },
  'Law': {
    hero: { headline: "Dedicated Legal Representation", subheadline: "Protecting your rights with decades of experience and unyielding commitment to justice.", primaryCTA: { label: "Free Consultation", url: "#" }, secondaryCTA: { label: "Practice Areas", url: "#" } },
    features: { headline: "Practice Areas", items: [{ title: "Corporate Law", description: "Comprehensive legal strategies for growing businesses." }, { title: "Intellectual Property", description: "Protecting your innovations and brand identity." }, { title: "Litigation", description: "Fierce advocacy in the courtroom." }] },
    testimonials: { headline: "Client Success Stories", items: [{ quote: "They provided clarity during a highly complex acquisition process.", author: "James Wilson", role: "CEO" }, { quote: "A law firm that truly fights for its clients. Exceptional results.", author: "Amanda Lee", role: "Client" }] }
  },
  'E-commerce': {
    hero: { headline: "Discover the New Collection", subheadline: "Elevate your everyday style with our latest arrivals. Designed for modern living.", primaryCTA: { label: "Shop Now", url: "#" }, secondaryCTA: { label: "View Lookbook", url: "#" } },
    gallery: { headline: "Trending Categories", items: [ { title: "Apparel" }, { title: "Footwear" }, { title: "Accessories" } ] },
    features: { headline: "The Premium Difference", items: [{ title: "Sustainable Materials", description: "Ethically sourced fabrics designed to last." }, { title: "Free Global Shipping", description: "On all orders over $150." }, { title: "Easy Returns", description: "30-day hassle-free return policy." }] }
  },
  'Fitness': {
    hero: { headline: "Push Your Limits", subheadline: "Transform your body and mind with our state-of-the-art facility and world-class trainers.", primaryCTA: { label: "Join Now", url: "#" }, secondaryCTA: { label: "Class Schedule", url: "#" } },
    features: { headline: "Why Choose Us", items: [{ title: "Expert Trainers", description: "Certified professionals dedicated to your goals." }, { title: "Premium Equipment", description: "The latest machines and free weight areas." }, { title: "Over 50 Classes/Week", description: "From HIIT to Yoga, find what moves you." }] },
    pricing: { headline: "Membership Plans", items: [{ title: "Basic", price: "$29", description: "Essential access", features: ["Gym access", "Locker rooms"] }, { title: "Pro", price: "$59", description: "Most popular", features: ["Unlimited classes", "Gym access", "Guest pass"] }, { title: "Elite", price: "$99", description: "All inclusive", features: ["Personal training session", "Recovery lounge", "Priority booking"] }] }
  },
  'Architecture': {
    hero: { headline: "Designing the Future", subheadline: "Award-winning architectural firm creating sustainable, innovative spaces for living and working.", primaryCTA: { label: "View Projects", url: "#" }, secondaryCTA: { label: "Our Vision", url: "#" } },
    features: { headline: "Our Approach", items: [{ title: "Sustainable Design", description: "Environmentally conscious materials and energy-efficient systems." }, { title: "Urban Integration", description: "Buildings that connect seamlessly with their surroundings." }, { title: "Human-Centric", description: "Spaces designed around the people who use them every day." }] },
    gallery: { headline: "Selected Works", items: [ { title: "The Oculus Tower" }, { title: "Westside Museum" }, { title: "Eco Residence" } ] }
  },
  'Technology': {
    hero: { headline: "Innovating Tomorrow", subheadline: "Pioneering technological solutions that drive digital transformation and empower global enterprises.", primaryCTA: { label: "Explore Solutions", url: "#" }, secondaryCTA: { label: "Read Case Studies", url: "#" } },
    features: { headline: "Core Capabilities", items: [{ title: "Artificial Intelligence", description: "Machine learning algorithms that automate and optimize operations." }, { title: "Cloud Infrastructure", description: "Scalable, secure cloud architectures for global deployment." }, { title: "Data Analytics", description: "Actionable insights derived from complex datasets." }] },
    testimonials: { headline: "Partner Success", items: [{ quote: "Their technology stack reduced our operational costs by 40% in the first year.", author: "Robert Chang", role: "COO, GlobalCorp" }, { quote: "Unparalleled technical expertise and flawless execution.", author: "Sarah Miller", role: "VP Engineering" }] }
  },
  'Agency': {
    hero: { headline: "We Build Brands That Matter", subheadline: "A full-service creative agency combining strategic thinking with exceptional design to elevate your brand.", primaryCTA: { label: "Our Work", url: "#" }, secondaryCTA: { label: "Start a Project", url: "#" } },
    features: { headline: "Services", items: [{ title: "Brand Identity", description: "Comprehensive branding, from logos to visual systems." }, { title: "Digital Product", description: "UI/UX design and development for web and mobile." }, { title: "Marketing Strategy", description: "Data-driven campaigns that convert audiences into customers." }] },
    gallery: { headline: "Recent Projects", items: [ { title: "Fintech Rebrand" }, { title: "E-commerce Platform" }, { title: "Global Campaign" } ] }
  },
  'Corporate': {
    hero: { headline: "Global Business Solutions", subheadline: "Empowering organizations to navigate complex challenges and achieve sustainable growth.", primaryCTA: { label: "Our Services", url: "#" }, secondaryCTA: { label: "Company Profile", url: "#" } },
    features: { headline: "Areas of Expertise", items: [{ title: "Strategic Consulting", description: "Navigating market shifts and identifying growth opportunities." }, { title: "Financial Advisory", description: "Comprehensive financial planning and risk management." }, { title: "Operations Excellence", description: "Streamlining processes for maximum efficiency." }] },
    testimonials: { headline: "Client Testimonials", items: [{ quote: "Their strategic insights were instrumental in our successful global expansion.", author: "Michael Thorpe", role: "CEO, Enterprise Ltd" }, { quote: "A trusted partner that consistently delivers exceptional value.", author: "Jessica Wong", role: "Board Member" }] }
  }
};
