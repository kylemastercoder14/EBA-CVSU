export const Heading = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className='space-y-1'>
      <h2 className='lg:text-3xl text-2xl text-[#07484A] font-semibold font-serif'>{title}</h2>
      <p className='text-[#07484A] lg:text-xl text-base'>{description}</p>
    </div>
  );
};
