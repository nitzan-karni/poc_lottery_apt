"""
Database seeder for development/demo data.
Run: python seed.py
"""
import uuid
import random
from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import (
    Project, ProjectStatus,
    Candidate, PriorityType, CandidateStatus,
    Document, DocumentType,
    VerificationResult,
    Apartment,
    Lottery,
    EmailLog, EmailType,
    AdminUser, AdminRole,
    Rule,
)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

first_names = ["Yael", "Noam", "Tamar", "Oren", "Shira", "Amit", "Dalia", "Eitan", "Maya", "Lior",
               "Noa", "Avi", "Michal", "Gal", "Roni", "Dana", "Idan", "Tali", "Ofir", "Shai",
               "Ella", "Rotem", "Yonatan", "Keren", "Omri", "Hila", "Alon", "Neta", "Uri", "Sapir"]
last_names = ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman",
              "Shapiro", "Goldstein", "Ben-David", "Katz", "Azulay", "Malka", "Yosef", "Haim",
              "Ochana", "Hadad", "Sasson", "Amar"]


def rnd(arr):
    return random.choice(arr)


def gen_id_number():
    """Generate a valid Israeli ID number for demo purposes."""
    while True:
        digits = [random.randint(0, 9) for _ in range(8)]
        total = 0
        for i, d in enumerate(digits):
            n = d * ((i % 2) + 1)
            if n > 9:
                n -= 9
            total += n
        check = (10 - (total % 10)) % 10
        id_str = "".join(str(d) for d in digits) + str(check)
        return id_str


def seed_projects():
    print("Seeding projects...")
    projects = [
        Project(
            id="proj-neve-ofer",
            name="Neve Ofer Towers",
            address="12 Herzl St, Tel Aviv",
            total_units=48,
            status=ProjectStatus.REGISTRATION_OPEN,
            deadline=datetime.utcnow() + timedelta(days=38),
        ),
        Project(
            id="proj-florentin",
            name="Florentin Gardens",
            address="88 Florentin St, Tel Aviv",
            total_units=32,
            status=ProjectStatus.UPCOMING,
            deadline=datetime.utcnow() + timedelta(days=85),
        ),
    ]
    for p in projects:
        existing = db.query(Project).filter(Project.id == p.id).first()
        if not existing:
            db.add(p)
    db.commit()
    return projects


def seed_apartments(projects):
    print("Seeding apartments...")
    apt_count = 0
    for project in projects:
        units = project.total_units
        for i in range(units):
            apt_id = f"apt-{project.id}-{i+1}"
            if db.query(Apartment).filter(Apartment.id == apt_id).first():
                continue
            apt = Apartment(
                id=apt_id,
                project_id=project.id,
                number=f"{i // 4 + 1}{chr(65 + (i % 4))}",
                floor=i // 4 + 1,
                rooms=random.choice([2.5, 3.0, 3.5, 4.0, 4.5]),
                sqm=round(55 + random.random() * 60, 1),
                price=round(1200000 + random.random() * 800000, -3),
                taken=i < 6 and project.id == "proj-neve-ofer",
            )
            db.add(apt)
            apt_count += 1
    db.commit()
    print(f"  {apt_count} apartments created")


def seed_admins():
    print("Seeding admin users...")
    admins = [
        ("super_admin@e-b.co.il", "SuperAdmin", "admin123", AdminRole.SUPER_ADMIN),
        ("reviewer@e-b.co.il", "QA Reviewer", "review123", AdminRole.REVIEWER),
    ]
    for email, name, password, role in admins:
        if db.query(AdminUser).filter(AdminUser.email == email).first():
            continue
        admin = AdminUser(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=get_password_hash(password),
            role=role,
        )
        db.add(admin)
    db.commit()


def seed_rules():
    print("Seeding rules...")
    rules_data = [
        ("Eligibility", "Registration Requirements", "Only candidates meeting all eligibility criteria (detailed in project registration booklets) may participate. The municipality may request additional documents or accept alternatives at its sole discretion.", 1),
        ("Eligibility", "Late Registration", "Late online registrations are automatically disqualified. Ensure submission before the published deadline.", 2),
        ("Documents", "Original Documents", "Candidates must keep original documents until the process ends. If requested, originals must be submitted to Ezra VaBitaron within 5 business days; failure results in disqualification.", 1),
        ("Appeals", "Appeal Process", "Candidates found ineligible may submit a written, reasoned appeal within 3 calendar days to tlv4less@e-b.co.il. The appeals committee's decision is final and sent by email.", 1),
        ("Penalties", "False Information", "Providing false/misleading information at any stage can result in disqualification, exclusion from future projects (temporarily or permanently), and criminal proceedings.", 1),
        ("Penalties", "Post-Contract Discovery", "If false information is discovered after a rental contract is signed, the municipality can terminate the contract and charge ₪5,000/month (+ prime rate + 6.5% interest) for each month of actual occupancy.", 2),
        ("Waiting List", "Validity Period", "Waiting lists are valid for the period stated in the registration booklet.", 1),
        ("Waiting List", "Re-evaluation", "If a waiting-list candidate is contacted 6+ months after the lottery, eligibility is re-evaluated at that time. Candidates must remain apartment-free throughout the entire process.", 2),
        ("General", "Regulation Changes", "The municipality may change the regulations at any time without prior notice.", 1),
        ("General", "Jurisdiction", "Exclusive jurisdiction: Tel Aviv-Yafo courts, under Israeli law.", 2),
        ("Priority", "Priority Categories", "Lottery draws are weighted by priority: Disabled (×5), Military Reserves (×4), Local Residents (×3), Young Couples (×2), Standard (×1).", 1),
    ]
    for category, title, content, order in rules_data:
        existing = db.query(Rule).filter(Rule.title == title).first()
        if not existing:
            db.add(Rule(
                id=str(uuid.uuid4()),
                category=category,
                title=title,
                content=content,
                order=order,
            ))
    db.commit()


def seed_candidates(projects):
    print("Seeding candidates...")
    priorities = list(PriorityType)
    statuses_pool = [
        CandidateStatus.PENDING_REVIEW,
        CandidateStatus.AI_VERIFIED,
        CandidateStatus.APPROVED,
        CandidateStatus.NEEDS_CORRECTION,
        CandidateStatus.REJECTED,
        CandidateStatus.WINNER,
        CandidateStatus.WAITLIST,
    ]

    candidates_created = []
    neve_ofer = next(p for p in projects if p.id == "proj-neve-ofer")

    for i in range(50):
        first = rnd(first_names)
        last = rnd(last_names)
        priority = rnd(priorities)

        if i < 8:
            status = CandidateStatus.APPROVED
        elif i < 12:
            status = CandidateStatus.WINNER
        elif i < 20:
            status = CandidateStatus.WAITLIST
        elif i < 25:
            status = CandidateStatus.AI_VERIFIED
        elif i < 30:
            status = CandidateStatus.NEEDS_CORRECTION
        elif i < 33:
            status = CandidateStatus.REJECTED
        else:
            status = CandidateStatus.PENDING_REVIEW

        lottery_number = None
        if status == CandidateStatus.WINNER:
            lottery_number = i - 11
        elif status == CandidateStatus.WAITLIST:
            lottery_number = i - 11

        candidate_id = str(uuid.uuid4())
        reg_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))

        candidate = Candidate(
            id=candidate_id,
            first_name=first,
            last_name=last,
            id_number=gen_id_number(),
            phone=f"05{random.randint(10000000, 99999999)}",
            email=f"{first.lower()}.{last.lower()}{random.randint(1, 99)}@gmail.com",
            project_id=neve_ofer.id,
            priority=priority,
            status=status,
            lottery_number=lottery_number,
            registration_date=reg_date,
            appeal_deadline=(reg_date + timedelta(days=3)) if status == CandidateStatus.REJECTED else None,
            is_apartmentless=True,
        )
        db.add(candidate)

        # Add mock documents
        for doc_type in [DocumentType.ID_CARD, DocumentType.ELIGIBILITY_CERTIFICATE]:
            doc = Document(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                type=doc_type,
                filename=f"{doc_type.value.lower()}_{first.lower()}.pdf",
                storage_key=f"mock/candidates/{candidate_id}/{doc_type.value}/sample.pdf",
                mime_type="application/pdf",
                file_size=random.randint(50000, 500000),
                verified=status not in [CandidateStatus.PENDING_REVIEW, CandidateStatus.NEEDS_CORRECTION],
            )
            db.add(doc)

        if priority == PriorityType.DISABLED:
            doc = Document(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                type=DocumentType.DISABILITY_CERTIFICATE,
                filename=f"disability_{first.lower()}.pdf",
                storage_key=f"mock/candidates/{candidate_id}/disability/sample.pdf",
                mime_type="application/pdf",
                file_size=random.randint(50000, 200000),
                verified=True,
            )
            db.add(doc)

        # Add verification result for verified/approved/winner candidates
        if status in [CandidateStatus.AI_VERIFIED, CandidateStatus.APPROVED, CandidateStatus.WINNER, CandidateStatus.WAITLIST]:
            vr = VerificationResult(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                two_distinct_ids=None,
                id_number_matches_card=True,
                name_matches_card=True,
                id_numbers_consistent=True,
                names_consistent=True,
                form_date_valid=True,
                has_proper_stamp=True,
                eligibility_number=f"EL-{random.randint(100000, 999999)}",
                is_apartmentless=True,
                overall_pass=True,
                raw_ai_response={"confidence_notes": "All checks passed."},
            )
            db.add(vr)
            candidate.eligibility_number = vr.eligibility_number

        elif status == CandidateStatus.NEEDS_CORRECTION:
            vr = VerificationResult(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                two_distinct_ids=None,
                id_number_matches_card=True,
                name_matches_card=False,
                id_numbers_consistent=True,
                names_consistent=True,
                form_date_valid=True,
                has_proper_stamp=False,
                eligibility_number=None,
                is_apartmentless=None,
                overall_pass=False,
                raw_ai_response={"confidence_notes": "Name mismatch and missing stamp detected."},
            )
            db.add(vr)

        candidates_created.append(candidate)

    db.commit()

    # Assign apartments to some winners
    winners = [c for c in candidates_created if c.status == CandidateStatus.WINNER]
    apts = db.query(Apartment).filter(
        Apartment.project_id == neve_ofer.id,
        Apartment.taken == True,
    ).all()
    for idx, apt in enumerate(apts):
        if idx < len(winners):
            winners[idx].apartment_chosen_id = apt.id
            winners[idx].status = CandidateStatus.APARTMENT_CHOSEN
    db.commit()

    print(f"  {len(candidates_created)} candidates created")


if __name__ == "__main__":
    print("Starting database seed...")
    projects = seed_projects()
    seed_apartments(projects)
    seed_admins()
    seed_rules()
    seed_candidates(projects)
    print("✅ Database seeded successfully!")
    print("\nAdmin credentials:")
    print("  Super Admin: super_admin@e-b.co.il / admin123")
    print("  Reviewer:    reviewer@e-b.co.il / review123")
    db.close()
